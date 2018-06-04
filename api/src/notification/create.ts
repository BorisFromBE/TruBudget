import { v4 as uuid } from "uuid";
import Intent from "../authz/intents";
import { AuthToken } from "../authz/token";
import { UserId } from "../authz/types";
import { MultichainClient } from "../multichain";
import { Event } from "../multichain/event";
import * as Project from "../project/model/Project";
import * as Subproject from "../subproject/model/Subproject";
import * as Workflowitem from "../workflowitem/model/workflowitem";
import * as Notification from "./model/Notification";

export async function createNotification(
  multichain: MultichainClient,
  resources: Notification.NotificationResourceDescription[],
  createdBy: UserId,
  createdFor: UserId,
  originalEvent: Event,
): Promise<void> {
  const notificationId: string = uuid();

  const intent: Intent = "notification.create";
  const creationTimestamp = new Date();
  const dataVersion = 1;
  const data: Notification.EventData = {
    notificationId,
    resources,
    isRead: false,
    originalEvent,
  };
  const event = { intent, createdBy, creationTimestamp, dataVersion, data };

  return Notification.publish(multichain, createdFor, event);
}

/**
 * Notify the assignee of the resource identified by the given IDs.
 *
 * @param publishedEvent The original event the notification should relate to.
 * @param skipNotificationsFor A list of users that should _not_ be notified.
 */
export async function notifyAssignee(
  multichain: MultichainClient,
  resourceDescriptions: Notification.NotificationResourceDescription[],
  createdBy: UserId,
  resource:
    | Project.ProjectResource
    | Project.ProjectResource[]
    | Subproject.SubprojectResource
    | Subproject.SubprojectResource[]
    | Workflowitem.WorkflowitemResource
    | Workflowitem.WorkflowitemResource[]
    | undefined,
  publishedEvent: Event,
  skipNotificationsFor: UserId[],
): Promise<string | undefined> {
  if (Array.isArray(resource)) {
    if (resource.length) {
      resource = resource[0];
    } else {
      resource = undefined;
    }
  }

  if (resource === undefined) return;
  const assignee = resource.data.assignee;

  if (assignee === undefined) return;
  if (skipNotificationsFor.includes(assignee)) return assignee;

  await createNotification(multichain, resourceDescriptions, createdBy, assignee, publishedEvent);

  return assignee;
}
