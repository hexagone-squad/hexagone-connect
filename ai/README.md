# AI Platform

The AI platform owns prompts, RAG/retrieval, agents, MCP/tool integration, model access, guardrails, evaluations, orchestration, cost and latency telemetry, and human approval workflows. AI providers are accessed through a provider-neutral gateway.

## Baseline controls now enforced

- Tenant-scoped retrieval only (cross-tenant citations are rejected)
- Grounded responses require at least one citation
- Consequential actions are blocked unless a human-approval token is provided
- Every response path writes an AI audit record
- Degraded provider paths use deterministic fallback and force human review

## Merge gates

- AI evaluation tests are required in pull requests via `pnpm --filter @hexagone/ai-orchestration evaluate`

## Platform components

### Prompts

Prompts are versioned product and operational assets. Prompt changes must define the task, inputs, output schema, safety constraints, grounding expectations, and evaluation evidence before merge.

### RAG and retrieval

RAG combines approved retrieval sources with prompt and orchestration rules. Retrieval is authorized access over versioned, approved knowledge sources. Retrieval must preserve tenant boundaries and source citations, and grounded responses must remain traceable to approved sources.

### Agents

Agents coordinate multi-step AI workflows, tool use, retrieval, and human approval checkpoints. Agent behavior must be bounded by schemas, permissions, guardrails, telemetry, and evaluation coverage.

### MCP and tools

MCP/tool integration must be provider-neutral, permissioned, observable, and reviewable. Tools must have explicit input schemas, authorization rules, timeout behavior, audit events, and failure handling.

### Model gateway

The model gateway is the provider-neutral adapter for model routing, timeouts, retries, budgets, redaction, and usage telemetry. Application code must depend on the gateway contract rather than a provider SDK directly.

### Evaluations

Evaluations prove prompt, RAG, agent, tool, and orchestration behavior before acceptance. They must cover groundedness, safety, schema validity, tenant isolation, cost, latency, and failure handling when applicable.
