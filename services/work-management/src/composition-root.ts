import { CreateWorkRequest } from "./application/create-work-request.js";
import { QualifyWorkRequest } from "./application/qualify-work-request.js";
import { InMemoryOutbox, InMemoryWorkRequestRepository } from "./infrastructure/in-memory-adapters.js";

export const buildWorkManagement = () => {
  const repository = new InMemoryWorkRequestRepository();
  const outbox = new InMemoryOutbox();
  return {
    createWorkRequest: new CreateWorkRequest(repository, outbox),
    qualifyWorkRequest: new QualifyWorkRequest(repository, outbox),
    repository,
    outbox
  };
};
