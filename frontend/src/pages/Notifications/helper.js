import strings from "../../localizeStrings";
import { formatString } from "../../helper";

function findDisplayName(intent, resources) {
  const resourceType = intent.substring(0, intent.indexOf("."));
  if (!resourceType) throw Error(`Unknown resource type for intent ${intent}`);
  const resource = resources.find(x => x.type === resourceType);
  return resource.displayName || "";
}

function translate(intent) {
  return strings.notification[intent.split(".").join("_")];
}

export const intentMapping = ({ originalEvent, resources }) => {
  const translation = translate(originalEvent.intent);
  if (!translation) return `${originalEvent.intent} (missing intent translation)`;

  const displayName = findDisplayName(originalEvent.intent, resources);

  const text = formatString(translation, displayName);
  return `${text} ${displayName ? "" : strings.notification.no_permissions}`;
};

export const parseURI = ({ resources }) => {
  const project = resources.find(resource => resource.type === "project");
  const subproject = resources.find(resource => resource.type === "subproject");
  if (subproject) {
    return `/projects/${project.id}/${subproject.id}`;
  } else {
    return `/projects/${project.id}`;
  }
};

export const fetchRessourceName = (res, type) => {
  const r = res.find(v => v.type === type);
  if (r !== undefined) {
    return r.displayName || strings.workflow.workflow_redacted;
  } else {
    return "-";
  }
};

export const hasAccess = res => res.reduce((acc, r) => acc && r.displayName !== undefined, true);
