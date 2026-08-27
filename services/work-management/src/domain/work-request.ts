export type WorkRequestStatus = "submitted" | "qualified" | "assigned" | "completed" | "cancelled";

export class InvalidWorkRequestStatusError extends Error {
  constructor() {
    super("Invalid work request status");
    this.name = "InvalidWorkRequestStatusError";
  }
}

export interface WorkRequestProps {
  id: string;
  tenantId: string;
  customerId: string;
  serviceCategory: string;
  status: WorkRequestStatus;
  createdAt: string;
}

export class WorkRequest {
  private constructor(readonly props: WorkRequestProps) {}

  static create(input: Omit<WorkRequestProps, "status" | "createdAt">, now: string): WorkRequest {
    if (!input.tenantId || !input.customerId || !input.serviceCategory.trim()) throw new Error("Invalid work request");
    return new WorkRequest({ ...input, status: "submitted", createdAt: now });
  }

  qualify(): WorkRequest {
    if (this.props.status !== "submitted") throw new InvalidWorkRequestStatusError();
    return new WorkRequest({ ...this.props, status: "qualified" });
  }
}
