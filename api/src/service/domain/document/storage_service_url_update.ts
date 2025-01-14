import Joi = require("joi");

import { Ctx } from "lib/ctx";
import logger from "lib/logger";
import { VError } from "verror";
import * as Result from "../../../result";
import { BusinessEvent } from "../business_event";
import { ServiceUser } from "../organization/service_user";
import * as StorageServiceUrlUpdated from "./storage_service_url_updated";

export interface RequestData {
  organization: string;
  organizationUrl: string;
}
export function validate(input: any): Result.Type<RequestData> {
  const { value, error } = Joi.validate(input, requestDataSchema);
  return !error ? value : error;
}

const requestDataSchema = Joi.object({
  organization: Joi.string().required(),
  organizationUrl: Joi.string().required(),
});

export async function storageServiceUrlPublish(
  ctx: Ctx,
  issuer: ServiceUser,
  requestData: RequestData,
): Promise<Result.Type<BusinessEvent>> {
  const { organization, organizationUrl } = requestData;
  logger.trace("Creating event: offchain_documents");

  // create Event: "offchain_documents" stream - create storage_service_url_published event (organization, url)
  const newUrlUpdatedEvent = StorageServiceUrlUpdated.createEvent(
    ctx.source,
    issuer.id,
    organization,
    organizationUrl,
  );
  if (Result.isErr(newUrlUpdatedEvent)) {
    return new VError(newUrlUpdatedEvent, "cannot update url");
  }
  return newUrlUpdatedEvent;
}
