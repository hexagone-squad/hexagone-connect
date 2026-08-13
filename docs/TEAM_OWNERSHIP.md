# Engineering Team Ownership

Ownership follows the approved five-engineer profile model. Ownership means the engineer is accountable for fitness, evidence, reviews, and operational readiness; it does not create isolated silos.

| Engineer profile | Primary ownership | Required merge authority |
|---|---|---|
| Tech Lead / Architect | Architecture fitness, domain boundaries, ADRs, SOLID rules, production readiness | Architecture and release gates |
| Product Engineer A | Public/customer experience, catalog/discovery, customer CRM journeys | Customer experience and contract gates |
| Product Engineer B | Partner network, work management, inspection and job workflows | Workflow and domain gates |
| Platform Engineer | API gateway/BFF, identity foundations, data platform, CI/CD, observability, security | Platform and security gates |
| AI/Data Engineer | Prompts, RAG/retrieval, agents, MCP/tool integration, evaluations, AI orchestration, guardrails, provider-neutral model gateway, analytics, cost/latency telemetry, human approvals, AI audit, and data quality | AI evaluation, orchestration, safety, and data gates |

## Shared accountability

All five engineers own tests, traceability, evidence, documentation, incident response, and review quality. AI-generated code receives the same review and verification requirements as human-generated code.
