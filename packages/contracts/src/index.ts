export interface WorkRequestCreatedV1 {
  eventType: "WorkRequestCreated";
  version: 1;
  requestId: string;
  tenantId: string;
  customerId: string;
  serviceCategory: string;
}
