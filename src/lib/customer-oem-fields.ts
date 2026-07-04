import { parseOptionalDate } from "@/lib/oem-registration";

export function oemFieldsFromBody(body: Record<string, unknown>) {
  return {
    oemOpportunityNo:
      body.oemOpportunityNo === undefined
        ? undefined
        : body.oemOpportunityNo
          ? String(body.oemOpportunityNo)
          : null,
    oemOpportunityName:
      body.oemOpportunityName === undefined
        ? undefined
        : body.oemOpportunityName
          ? String(body.oemOpportunityName)
          : null,
    oemRegisterStartAt:
      body.oemRegisterStartAt === undefined ? undefined : parseOptionalDate(body.oemRegisterStartAt),
    oemRegisterExpiresAt:
      body.oemRegisterExpiresAt === undefined ? undefined : parseOptionalDate(body.oemRegisterExpiresAt),
  };
}

export function stripUndefined<T extends Record<string, unknown>>(data: T) {
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as Partial<T>;
}
