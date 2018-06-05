import { getAllowedIntents } from "../../authz";
import { onlyAllowedData } from "../../authz/history";
import { getUserAndGroups } from "../../authz/index";
import Intent from "../../authz/intents";
import { AuthToken } from "../../authz/token";
import { AllowedUserGroupsByIntent, People } from "../../authz/types";
import deepcopy from "../../lib/deepcopy";
import { isNotEmpty } from "../../lib/isNotEmpty";
import { asMapKey } from "../../multichain/Client";
import { MultichainClient } from "../../multichain/Client.h";
import { Event, throwUnsupportedEventVersion } from "../../multichain/event";

const workflowitemsGroupKey = subprojectId => `${subprojectId}_workflows`;

const workflowitemKey = (subprojectId, workflowitemId) => [
  workflowitemsGroupKey(subprojectId),
  workflowitemId,
];

export interface AugmentedEvent extends Event {
  snapshot: {
    displayName: string;
    amount: string;
    currency: string;
    amountType: string;
  };
}

export interface WorkflowitemResource {
  log: AugmentedEvent[];
  allowedIntents: Intent[];
  data: Data;
}

export interface Data {
  id: string;
  creationUnixTs: string;
  displayName: string;
  amount: string;
  currency: string;
  amountType: "N/A" | "disbursed" | "allocated";
  description: string;
  status: "open" | "closed";
  assignee?: string;
  documents: Document[];
}

export interface ObscuredData {
  id: string;
  creationUnixTs: string;
  displayName: null;
  amount: null;
  currency: null;
  amountType: null;
  description: null;
  status: "open" | "closed";
  assignee: null;
  documents: null;
}

export interface Update {
  displayName?: string;
  amount?: string;
  currency?: string;
  amountType?: "N/A" | "disbursed" | "allocated";
  description?: string;
}

export interface Document {
  description: string;
  hash: string;
}

const redactWorkflowitemData = (workflowitem: Data): ObscuredData => ({
  id: workflowitem.id,
  creationUnixTs: workflowitem.creationUnixTs,
  displayName: null,
  amount: null,
  currency: null,
  amountType: null,
  description: null,
  status: workflowitem.status,
  assignee: null,
  documents: null,
});

export async function publish(
  multichain: MultichainClient,
  projectId: string,
  subprojectId: string,
  workflowitemId: string,
  args: {
    intent: Intent;
    createdBy: string;
    creationTimestamp: Date;
    dataVersion: number; // integer
    data: object;
  },
): Promise<Event> {
  const { intent, createdBy, creationTimestamp, dataVersion, data } = args;
  const event: Event = {
    key: workflowitemId,
    intent,
    createdBy,
    createdAt: creationTimestamp.toISOString(),
    dataVersion,
    data,
  };
  const streamName = projectId;
  const streamItemKey = workflowitemKey(subprojectId, workflowitemId);
  const streamItem = { json: event };
  console.log(`Publishing ${intent} to ${streamName}/${streamItemKey}`);
  await multichain.getRpcClient().invoke("publish", streamName, streamItemKey, streamItem);
  return event;
}

export async function get(
  multichain: MultichainClient,
  token: AuthToken,
  projectId: string,
  subprojectId: string,
  workflowitemId?: string,
  skipAuthorizationCheck?: "skip authorization check FOR INTERNAL USE ONLY TAKE CARE DON'T LEAK DATA !!!",
): Promise<WorkflowitemResource[]> {
  const queryKey =
    workflowitemId !== undefined ? workflowitemId : workflowitemsGroupKey(subprojectId);

  const streamItems = await multichain.v2_readStreamItems(projectId, queryKey);
  const userAndGroups = await getUserAndGroups(token);
  const resourceMap = new Map<string, WorkflowitemResource>();
  const permissionsMap = new Map<string, AllowedUserGroupsByIntent>();

  for (const item of streamItems) {
    const event = item.data.json as Event;

    let resource = resourceMap.get(asMapKey(item));
    if (resource === undefined) {
      const result = handleCreate(event);
      if (result === undefined) {
        throw Error(`Failed to initialize resource: ${JSON.stringify(event)}.`);
      }
      resource = result.resource;
      permissionsMap.set(asMapKey(item), result.permissions);
    } else {
      // We've already encountered this workflowitem, so we can apply operations on it.
      const permissions = permissionsMap.get(asMapKey(item))!;
      const hasProcessedEvent =
        applyUpdate(event, resource) ||
        applyAssign(event, resource) ||
        applyClose(event, resource) ||
        applyGrantPermission(event, permissions) ||
        applyRevokePermission(event, permissions);
      if (!hasProcessedEvent) {
        throw Error(`I don't know how to handle this event: ${JSON.stringify(event)}.`);
      }
    }

    if (resource !== undefined) {
      // Save all events to the log for now; we'll filter them once we
      // know the final resource permissions.
      resource.log.push({
        ...event,
        snapshot: {
          displayName: deepcopy(resource.data.displayName),
          amount: deepcopy(resource.data.amount),
          currency: deepcopy(resource.data.currency),
          amountType: deepcopy(resource.data.amountType),
        },
      });
      resourceMap.set(asMapKey(item), resource);
    }
  }

  for (const [key, permissions] of permissionsMap.entries()) {
    const resource = resourceMap.get(key);
    if (resource !== undefined) {
      resource.allowedIntents = await getAllowedIntents(userAndGroups, permissions);
    }
  }

  const unfilteredResources = [...resourceMap.values()];

  if (
    skipAuthorizationCheck ===
    "skip authorization check FOR INTERNAL USE ONLY TAKE CARE DON'T LEAK DATA !!!"
  ) {
    return unfilteredResources;
  }

  // Instead of filtering out workflowitems the user is not allowed to see,
  // we simply blank out all fields except the status, which is considered "public".
  const allowedToSeeDataIntent: Intent = "workflowitem.view";
  const filteredResources = unfilteredResources.map(resource => {
    // Redact data if the user is not allowed to view it:
    const isAllowedToSeeData = resource.allowedIntents.includes(allowedToSeeDataIntent);
    if (!isAllowedToSeeData) resource.data = redactWorkflowitemData(resource.data) as any;

    // Filter event log according to the user permissions and the type of event:
    resource.log = resource.log
      .map(event => onlyAllowedData(event, resource.allowedIntents) as AugmentedEvent | null)
      .filter(isNotEmpty);

    return resource;
  });

  return filteredResources;
}

function handleCreate(
  event: Event,
): { resource: WorkflowitemResource; permissions: AllowedUserGroupsByIntent } | undefined {
  if (event.intent !== "subproject.createWorkflowitem") return undefined;
  switch (event.dataVersion) {
    case 1: {
      const { workflowitem, permissions } = event.data;
      return {
        resource: {
          data: deepcopy(workflowitem),
          log: [], // event is added later
          allowedIntents: [], // is set later using permissionsMap
        },
        permissions: deepcopy(permissions),
      };
    }
  }
  throwUnsupportedEventVersion(event);
}

function applyUpdate(event: Event, resource: WorkflowitemResource): true | undefined {
  if (event.intent !== "workflowitem.update") return;
  switch (event.dataVersion) {
    case 1: {
      const update: Update = event.data;
      ["displayName", "amount", "currency", "amountType", "description"].forEach(key => {
        setIfDefinedAndToUndefinedIfNull(resource.data, key, update[key]);
      });
      return true;
    }
  }
  throwUnsupportedEventVersion(event);
}

function setIfDefinedAndToUndefinedIfNull(obj, key, val) {
  if (val === undefined) return;
  if (val === null) val = undefined;
  obj[key] = val;
}

function applyAssign(event: Event, resource: WorkflowitemResource): true | undefined {
  if (event.intent !== "workflowitem.assign") return;
  switch (event.dataVersion) {
    case 1: {
      const { userId } = event.data;
      resource.data.assignee = userId;
      return true;
    }
  }
  throwUnsupportedEventVersion(event);
}

function applyClose(event: Event, resource: WorkflowitemResource): true | undefined {
  if (event.intent !== "workflowitem.close") return;
  switch (event.dataVersion) {
    case 1: {
      resource.data.status = "closed";
      return true;
    }
  }
  throwUnsupportedEventVersion(event);
}

function applyGrantPermission(
  event: Event,
  permissions: AllowedUserGroupsByIntent,
): true | undefined {
  if (event.intent !== "workflowitem.intent.grantPermission") return;
  switch (event.dataVersion) {
    case 1: {
      const { userId, intent } = event.data;
      const permissionsForIntent: People = permissions[intent] || [];
      if (!permissionsForIntent.includes(userId)) {
        permissionsForIntent.push(userId);
      }
      permissions[intent] = permissionsForIntent;
      return true;
    }
  }
  throwUnsupportedEventVersion(event);
}

function applyRevokePermission(
  event: Event,
  permissions: AllowedUserGroupsByIntent,
): true | undefined {
  if (event.intent !== "workflowitem.intent.revokePermission") return;
  switch (event.dataVersion) {
    case 1: {
      const { userId, intent } = event.data;
      const permissionsForIntent: People = permissions[intent] || [];
      const userIndex = permissionsForIntent.indexOf(userId);
      if (userIndex !== -1) {
        // Remove the user from the array:
        permissionsForIntent.splice(userIndex, 1);
        permissions[intent] = permissionsForIntent;
      }
      return true;
    }
  }
  throwUnsupportedEventVersion(event);
}

export async function getPermissions(
  multichain: MultichainClient,
  projectId: string,
  workflowitemId: string,
): Promise<AllowedUserGroupsByIntent> {
  const streamItems = await multichain.v2_readStreamItems(projectId, workflowitemId);
  let permissions: AllowedUserGroupsByIntent | undefined;
  for (const item of streamItems) {
    const event = item.data.json;
    if (permissions === undefined) {
      const result = handleCreate(event);
      if (result !== undefined) {
        permissions = result.permissions;
      } else {
        // skip event
      }
    } else {
      // Permissions has been initialized.
      const _hasProcessedEvent =
        applyGrantPermission(event, permissions) || applyRevokePermission(event, permissions);
    }
  }
  if (permissions === undefined) {
    throw { kind: "NotFound", what: `Workflowitem ${workflowitemId} of project ${projectId}.` };
  }
  return permissions;
}

export async function areAllClosed(
  multichain: MultichainClient,
  projectId: string,
  subprojectId: string,
): Promise<boolean> {
  const streamItems = await multichain.v2_readStreamItems(
    projectId,
    workflowitemsGroupKey(subprojectId),
  );

  type statusType = string;
  const resultMap = new Map<string, statusType>();

  for (const item of streamItems) {
    const event = item.data.json;
    switch (event.intent) {
      case "subproject.createWorkflowitem": {
        resultMap.set(asMapKey(item), event.data.workflowitem.status);
        break;
      }
      case "workflowitem.close": {
        resultMap.set(asMapKey(item), "closed");
        break;
      }
      default: {
        /* ignoring other events */
      }
    }
  }

  // const offendingItems: StreamKey[] = [];
  // for (const [keys, status] of resultMap.entries()) {
  //   if (status !== "closed") offendingItems.push(keys);
  // }

  for (const status of resultMap.values()) {
    if (status !== "closed") return false;
  }
  return true;
}