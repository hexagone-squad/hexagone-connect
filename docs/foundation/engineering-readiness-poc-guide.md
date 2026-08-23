# Engineering Readiness and POC Contribution Guide

> **Status:** Pre-requirements — training and proof-of-concept work only  
> **Audience:** Hexagone Connect IT Team  
> **Version:** 1.0 — 2026-08-13  
> **Owner:** Technology, Product & Architecture Lead

## 1. Purpose

This guide gives each IT team member a safe, practical assignment while approved business and MVP requirements are still pending. The goal is to learn the repository, exercise the engineering workflow, produce small proof-of-concept (POC) evidence, and recommend options without prematurely selecting production architecture or tooling.

The sprint should leave the team with:

- working, reviewable POCs based only on synthetic data;
- documented risks, assumptions, and open decisions;
- measurable evidence that informs later architecture decisions;
- team familiarity with the repository's agent-assisted engineering workflow; and
- no implied approval of business requirements, cloud vendors, or production design.

## 2. Authority and guardrails

This guide supplements, but does not replace, the repository's canonical policies:

- [Engineering Constitution](../methodology/CONSTITUTION.md)
- [Verification contract](../methodology/verification.md)
- [Implementation Loop](implementation-loop.md)
- [Development guide](../development.md)
- [Engineering team ownership](../TEAM_OWNERSHIP.md)
- [Repository agent instructions](../../AGENTS.md)

Every contribution must follow these rules:

1. Label work as `TRAINING`, `POC`, `PROPOSED`, or `NOT FOR PRODUCTION`.
2. Use synthetic data only. Do not use customer, provider, payment, identity, or event-production data.
3. Do not create live cloud resources, paid services, production secrets, or external integrations without written approval.
4. Do not treat assumptions as requirements. Record each assumption and the decision or business input needed to validate it.
5. Preserve tenant boundaries, least privilege, auditability, accessibility, privacy, and human oversight.
6. Prefer small, reversible changes with tests and evidence.
7. Do not merge a technology selection merely because a POC works. POCs inform ADRs; they do not approve them.
8. Follow the repository [pull request template](../../.github/pull_request_template.md) and report checks exactly as passed, failed, not run, or not applicable.

## 3. Common contribution workflow

Each engineer uses the same workflow:

1. **Orient and prove the gap:** Read the root README, documentation index, constitution, ownership guide, applicable path instructions, and relevant code. Search `main` and link the files that already implement related behavior. The POC may proceed only when the missing capability is stated clearly.
2. **Define:** Write a one-paragraph problem statement, success criteria, assumptions, exclusions, and applicable `HC-*` or `SC-*` rules.
3. **Design:** Identify the smallest boundary to exercise. Record alternatives and why the POC is worth running.
4. **Implement:** Create the smallest runnable slice on a focused branch. Keep domain logic separate from adapters and vendor-specific code.
5. **Verify:** Run focused tests and the repository quality gates that apply. Never report an unexecuted check as passed.
6. **Evidence:** Capture comparable before/after evidence, commands, output, screenshots where relevant, and limitations.
7. **Review:** Request the assigned peer reviewer and address findings with traceable changes.
8. **Recommend:** Submit a short contribution proposal: reuse, refactor, replace, defer, or investigate further.

## 4. Required POC outputs

Every POC must include:

- a baseline-gap statement listing what already exists on `main`, with repository links, and what remains unimplemented;
- a README with purpose, scope, assumptions, setup, execution, cleanup, and limitations;
- one runnable demonstration or automated test;
- architecture or data-flow notes when a boundary is introduced;
- a threat, privacy, accessibility, or operational note appropriate to the change;
- exact validation results;
- a recommendation with trade-offs, cost/complexity considerations, and unanswered questions; and
- a draft pull request that follows the Implementation Loop evidence requirements.

## 5. Role-based POC charters

### Repository baseline checked before assignment

The following capabilities already exist and must be reused rather than rebuilt:

| Area | Existing baseline | Assigned gap |
|---|---|---|
| Architecture | ADRs and dependency-direction enforcement | Open-decision readiness register and tenant scenario matrix |
| Platform | PR quality gates, secret/dependency/source scanning, Dockerfile, local PostgreSQL, observability types | Container hardening, image/SBOM evidence, and tested synthetic database restore |
| Product | Work-management domain/application logic, OpenAPI contract, tenant authorization helper, app shells | First runnable HTTP adapter and first operator-facing workflow |
| AI | Tenant isolation, citation requirement, human-approval gate, deterministic fallback, audit record, provider-outage tests | Read-only MCP-style tool boundary and missing tool/prompt abuse evaluations |

If `main` changes before a POC starts, the contributor must repeat the gap check. If the assigned gap has since been implemented, stop and propose a different extension to the Technology, Product & Architecture Lead.

### 5.1 Celestin Mbuyamba — Technology, Product & Architecture Lead

**Existing ownership profile:** Tech Lead / Architect

**POC:** Open-decision readiness register and tenant-boundary scenario matrix.

**Reuse from the repository:** Existing ADRs, architecture documentation, dependency-direction test, governance checks, and Implementation Loop evidence.

**Objective:** Make unresolved decisions and missing business inputs visible without recreating existing architecture rules or prematurely approving a solution.

**New work only:**

- Inventory the existing ADRs and enforced constraints, linking each item to its current repository evidence.
- Create a proposed decision-readiness register with: decision ID, current evidence, missing business input, options, decision owner, required POC, status, and review date.
- Build a tenant scenario matrix covering customer organizations, provider organizations, internal operators, users with multiple affiliations, and attempted cross-tenant access.
- Add a small automated validation that rejects incomplete decision-register entries; do not add another dependency-direction test.
- Prepare the IT architecture review agenda from the unresolved entries.

**POC output artifacts:**

- [Decision readiness register (POC)](decision-readiness-register.md)
- [Tenant-boundary scenario matrix (POC)](tenant-boundary-scenario-matrix.md)
- [IT architecture review agenda (POC)](it-architecture-review-agenda.md)

**Evidence of success:** The validator catches an incomplete entry, and the team can distinguish implemented constraints from open business or architecture decisions.

**Do not:** Duplicate existing ADRs or architecture tests, or approve a vendor, service topology, tenant definition, SLO, or production design without the required review and business input.

### 5.2 Abdourahmane Bah (Abdou) — Cloud, DevOps & Cybersecurity

**Existing ownership profile:** Platform Engineer, with security and operational focus

**POC:** Harden the existing local container path and prove a synthetic database restore.

**Reuse from the repository:** Existing work-management Dockerfile, `docker-compose.yml` PostgreSQL service, PR quality-gate workflow, secret scanning, dependency scanning, SDL source analysis, and observability interfaces.

**Objective:** Fill the operational gaps in the current placeholders without selecting a final cloud platform or rebuilding the existing CI pipeline.

**New work only:**

- Harden the existing work-management container POC with a non-root runtime, deterministic build, and a meaningful health/readiness smoke test.
- Add POC evidence for container/image scanning and an SBOM; extend the existing security workflow only where these checks are missing.
- Create a synthetic PostgreSQL backup-and-restore drill using the existing local Compose dependency.
- Record the measured local restore time and data result without presenting them as production RTO/RPO.
- Document remaining gaps for secrets management, centralized telemetry, cloud runtime, and production recovery.

**Evidence of success:** A reviewer can build and test the hardened container, inspect image/SBOM results, and reproduce restoration of synthetic records.

**Do not:** Recreate the existing PR workflow or source-security checks, provision production infrastructure, purchase services, or claim production availability and recovery commitments.

### 5.3 Joy Lukoji Mbiya — Full-Stack Engineering

**Existing ownership profile:** Product Engineer, customer and workflow implementation focus

**POC:** First runnable HTTP adapter for the existing work-request creation use case.

**Reuse from the repository:** Work-management domain and application services, composition root, in-memory adapters, `POST /v1/work-requests` OpenAPI contract, event schema, and tenant authorization helper.

**Objective:** Implement the missing runtime boundary without duplicating domain logic or redefining the existing contract.

**New work only:**

- Add the first runnable HTTP adapter for `POST /v1/work-requests` in the appropriate service or gateway boundary.
- Map validated requests into the existing create-work-request application use case.
- Propagate authenticated tenant context and return the contract's `202`, `400`, `401`, and `403` outcomes.
- Add adapter/contract tests, including invalid input and attempted cross-tenant access.
- Provide an exact local run command and one synthetic request/response demonstration.

**Evidence of success:** A teammate can start the adapter, submit a synthetic request, and observe safe, contract-compliant success and failure behavior.

**Do not:** Rebuild the work-management domain, create a second API contract, or invent pricing, payment/refund, provider-approval, or final customer-journey requirements.

### 5.4 Chapelle Kabangu — Digital Platform & Product Operations

**Existing ownership profile:** Product/Platform Engineer, integration and operability focus

**POC:** First operator-facing synthetic work-qualification queue.

**Reuse from the repository:** Admin-portal shell, API-gateway shell, work-management qualification use case, existing contracts, and synthetic/in-memory adapters.

**Objective:** Turn an empty application shell into a small operator workflow while avoiding unapproved operational policy.

**New work only:**

- Create a minimal admin-portal view of synthetic work requests awaiting qualification.
- Exercise the existing qualification use case through an adapter or test fixture instead of reimplementing its rules.
- Show empty, loading, validation, authorization, and service-failure states with accessible interactions.
- Display a correlation identifier and a synthetic audit/timeline entry for the operator action.
- Add a smoke or accessibility test and a short reuse assessment for the admin-portal and API-gateway shells.

**Evidence of success:** A reviewer can run the operator POC, qualify a synthetic request, inspect the correlation/audit evidence, and reproduce failure states.

**Do not:** Rebuild Joy's create-work-request adapter or encode final provider activation, complaint, refund, or event-completion policy.

### 5.5 Mamadou Aliou Diallo — AI & Data Engineering

**Existing ownership profile:** AI/Data Engineer

**POC:** Read-only synthetic MCP-style tool boundary and missing abuse evaluations.

**Reuse from the repository:** Inspection-assistant orchestration, tenant-scoped retrieval, citation enforcement, human-approval gate, deterministic provider fallback, AI audit record, schema checks, and existing tenant/outage evaluations.

**Objective:** Prove the currently missing tool-integration boundary and its safety behavior without duplicating existing AI guardrails or connecting to a live system.

**New work only:**

- Define and implement a provider-neutral, read-only MCP-style tool contract for retrieving a synthetic inspection record.
- Include explicit input/output schemas, tenant authorization, timeout behavior, bounded response size, correlation/audit metadata, and safe error mapping.
- Add evaluations for prompt injection through tool input, malformed tool output, tool timeout, excessive data, sensitive-data redaction, and cross-tenant tool access.
- Reuse the existing human-approval and fallback mechanisms instead of implementing parallel controls.
- Record deterministic latency and invocation-count evidence; label cost figures as estimates unless a real approved provider is used.

**Evidence of success:** The synthetic tool succeeds for an authorized request and the evaluation suite blocks or safely contains each abuse and failure scenario.

**Do not:** Reimplement existing tenant-leakage/provider-outage tests, connect to live data, grant write authority, or let AI make final provider, refund, contractual, or compliance decisions.

## 6. Peer review model

| Contributor | Primary reviewer | Review emphasis |
|---|---|---|
| Celestin | Abdou and Mamadou | Operational feasibility, security, AI/data boundaries |
| Abdou | Celestin | Architecture fit, cost/complexity, reversible platform choices |
| Joy | Chapelle | Workflow usability, contracts, operational handoffs |
| Chapelle | Joy | Implementation feasibility, accessibility, integration quality |
| Mamadou | Celestin and Abdou | Architecture, safety, privacy, auditability, operational controls |

CODEOWNERS and repository-required reviewers remain authoritative. Peer review here adds learning and cross-functional feedback; it does not bypass merge rules.

## 7. Contribution proposal template

Each engineer should include the following in the POC README or linked proposal:

```markdown
# POC contribution proposal

## Problem
What question does this POC answer?

## Scope
What is included and explicitly excluded?

## Assumptions and required business input
- Assumption:
- Owner who can confirm it:
- Impact if the assumption is wrong:

## Options considered
1. Option and trade-offs
2. Option and trade-offs

## Evidence
- Demo or test:
- Validation results:
- Before/after evidence:
- Security/privacy/accessibility/operational notes:

## Recommendation
Reuse, refactor, replace, defer, or investigate further — and why.

## Open decisions
- Decision:
- Proposed owner:
- Evidence still needed:
```

## 8. Suggested 2–3 working-day readiness cycle

This is a flexible target for a small practice POC, not a fixed delivery deadline.

| Day | Team activity | Expected output |
|---|---|---|
| 1 | Repository orientation, POC definition, and small design | Problem, scope, success criteria, assumptions, applicable rules |
| 2 | Implement and test the smallest useful slice | Runnable local POC, focused tests or evaluations, and initial evidence |
| 3, when needed | Verify, peer review, demonstrate, and recommend | Exact results, review findings, draft PR, recommendation, and open decisions |

Keep the question narrow enough to finish in two or three working days. Team members contributing part-time may adjust the calendar duration, but must not skip testing, security, evidence, or review.

## 9. Definition of done

A readiness POC is complete when:

- its purpose and training/POC status are obvious;
- assumptions and exclusions are documented;
- synthetic data is used throughout;
- the demonstration is reproducible by another team member;
- relevant focused tests or evaluations exist;
- verification results are reported accurately;
- security, privacy, tenant, accessibility, AI-safety, and operational impacts are considered where applicable;
- the contributor provides a recommendation and open questions;
- peer review findings are resolved or recorded; and
- the draft PR contains traceability and Implementation Loop evidence.

Completion of a POC does **not** mean the approach is approved for production.

## 10. Decisions after the sprint

The IT architecture review should use the POC evidence to decide or assign next steps for:

- the Hexagone tenant definition and isolation model;
- MVP deployment direction and service granularity;
- cloud provider, runtime, identity, CI/CD, infrastructure-as-code, and observability choices;
- business-approved availability, recovery, backup, and cost targets;
- Phase 0 security and operational controls;
- AI decision boundaries, human approvals, audit evidence, and MCP/tool authority; and
- which repository components to reuse, refactor, replace, or defer.

Where business, Contracts and Compliance, Finance, Operations, or Event Technology input is required, record the question and owner rather than filling the gap with an engineering assumption.
