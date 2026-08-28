# AI Orchestration Service

Owns prompts, RAG/retrieval, agents, MCP/tool integration, provider-neutral model gateway, prompt/model registry, guardrails, evaluation execution, quotas, human approvals, and AI audit records. Primary owner: AI/Data Engineer.

## Ownership focus

- Prompt design, versioning, schemas, and safety constraints
- RAG and retrieval boundaries, citations, source approval, and tenant isolation
- Agent workflow design, tool orchestration, retries, approvals, and auditability
- MCP/tool contracts, permissions, timeouts, and telemetry
- Evaluation suites for prompts, RAG, agents, tools, and orchestration behavior
- Provider-neutral model gateway behavior, routing, redaction, budgets, and fallback paths
- Guardrails, quotas, human approvals, AI audit records, analytics, cost, and latency telemetry

## Implemented baseline

- `runInspectionAssistant` enforces tenant access and retrieval tenant-boundary checks.
- Output schema checks require answer text, citations, and confidence in `[0, 1]`.
- Consequential action categories are blocked unless `humanApprovalToken` is present.
- Model failure paths fall back to a deterministic response and force human review.
- All execution paths emit an AI audit record payload.

## Evidence

- Contract tests: `services/ai-orchestration/test/inspection-assistant.contract.test.ts`
- Evaluation tests: `services/ai-orchestration/evaluations/inspection-assistant.evaluation.test.ts`

## Read-only inspection record tool POC

- Added a provider-neutral getInspectionRecord tool boundary for synthetic inspection records only.
- Tool access is tenant-scoped and fails closed on unauthorized or cross-tenant retrieval.
- Empty identifiers are rejected before retrieval.
- Retrieval has deterministic timeout and failure handling.
- Every tool outcome emits an audit event: success, not-found, denied, invalid-input, timeout, or failure.
- No write-capable operation or live data source is introduced by this POC.

## POC evidence

- Contract tests: services/ai-orchestration/test/inspection-record-tool.contract.test.ts
- Abuse/failure evaluations: services/ai-orchestration/evaluations/inspection-record-tool.evaluation.test.ts
- AI orchestration test suite: 15 tests passing
