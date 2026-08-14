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

1. **Orient:** Read the root README, documentation index, constitution, ownership guide, applicable path instructions, and relevant code.
2. **Define:** Write a one-paragraph problem statement, success criteria, assumptions, exclusions, and applicable `HC-*` or `SC-*` rules.
3. **Design:** Identify the smallest boundary to exercise. Record alternatives and why the POC is worth running.
4. **Implement:** Create the smallest runnable slice on a focused branch. Keep domain logic separate from adapters and vendor-specific code.
5. **Verify:** Run focused tests and the repository quality gates that apply. Never report an unexecuted check as passed.
6. **Evidence:** Capture comparable before/after evidence, commands, output, screenshots where relevant, and limitations.
7. **Review:** Request the assigned peer reviewer and address findings with traceable changes.
8. **Recommend:** Submit a short contribution proposal: reuse, refactor, replace, defer, or investigate further.

## 4. Required POC outputs

Every POC must include:

- a README with purpose, scope, assumptions, setup, execution, cleanup, and limitations;
- one runnable demonstration or automated test;
- architecture or data-flow notes when a boundary is introduced;
- a threat, privacy, accessibility, or operational note appropriate to the change;
- exact validation results;
- a recommendation with trade-offs, cost/complexity considerations, and unanswered questions; and
- a draft pull request that follows the Implementation Loop evidence requirements.

## 5. Role-based POC charters

### 5.1 Celestin Mbuyamba — Technology, Product & Architecture Lead

**Existing ownership profile:** Tech Lead / Architect

**POC:** Technical decision register and architecture fitness checks.

**Objective:** Establish a lightweight, evidence-based way to manage decisions without finalizing choices before requirements are known.

**Work items:**

- Create a proposed decision register covering tenant definition, deployment model, cloud/runtime, identity, availability and recovery targets, AI/MCP boundaries, and data ownership.
- Classify each decision as `open`, `POC required`, `business input required`, `accepted`, or `deferred`.
- Add one executable architecture fitness test for a current hard constraint, such as tenant-context propagation or forbidden dependency direction.
- Prepare the agenda for an IT architecture review focused on decisions, owners, risks, and Phase 0.

**Evidence of success:** The team can identify what is decided, what is not decided, who supplies the missing input, and which evidence is needed next.

**Do not:** Approve a vendor, service topology, SLO, or production design without team review and the required ADR/business input.

### 5.2 Abdourahmane Bah (Abdou) — Cloud, DevOps & Cybersecurity

**Existing ownership profile:** Platform Engineer, with security and operational focus

**POC:** Cloud-neutral Phase 0 delivery and security baseline.

**Objective:** Demonstrate the minimum secure delivery path without selecting the final cloud platform.

**Work items:**

- Package one existing service or test fixture as a locally runnable container with health and readiness behavior.
- Propose a CI pipeline that includes formatting, linting, type checking, tests, secret scanning, dependency review, and image or filesystem scanning.
- Demonstrate local secrets injection without committing credentials.
- Emit structured logs, a basic metric, and a trace or correlation identifier.
- Demonstrate backup and restore for synthetic state, documenting observed recovery time and data loss window rather than asserting production RTO/RPO.
- Create a concise threat model covering CI/CD, artifact integrity, secrets, tenant boundaries, and administrative access.

**Evidence of success:** A reviewer can reproduce the local path, inspect security results, and understand which cloud/runtime decisions remain open.

**Do not:** Provision production infrastructure, purchase services, or claim 99.9% availability, RPO, or RTO commitments.

### 5.3 Joy Lukoji Mbiya — Full-Stack Engineering

**Existing ownership profile:** Product Engineer, customer and workflow implementation focus

**POC:** Minimal runnable product slice around the existing work-management domain.

**Objective:** Prove that repository domain code can be exposed through a thin adapter while preserving contracts, validation, and tenant context.

**Work items:**

- Build a minimal HTTP or UI adapter for one synthetic work-management journey.
- Use the existing domain/service contracts rather than duplicating business logic in the adapter.
- Include input validation, error states, tenant-context handling, loading/empty states if a UI is used, and accessible interaction basics.
- Add contract-focused and adapter-focused tests.
- Document gaps that require approved product requirements.

**Evidence of success:** The slice runs locally, demonstrates one end-to-end path with synthetic data, and fails safely for invalid or cross-tenant requests.

**Do not:** Invent final customer journeys, pricing, payment/refund behavior, provider approval rules, or production APIs.

### 5.4 Chapelle Kabangu — Digital Platform & Product Operations

**Existing ownership profile:** Product/Platform Engineer, integration and operability focus

**POC:** Operator-facing workflow and repository reuse assessment.

**Objective:** Show how an internal operator could observe or coordinate a synthetic workflow and identify what the current skeleton can support.

**Work items:**

- Create a thin operator-facing workflow or API composition using existing contracts and services.
- Produce a reuse matrix for relevant repository components: `reuse`, `refactor`, `replace`, or `unknown`.
- Document error handling, retries, idempotency, audit events, and the minimum operational runbook.
- Identify handoffs that will require business decisions, especially provider activation, complaint escalation, refunds, and event completion.
- Capture product-operability observations without defining unapproved policy.

**Evidence of success:** The team has a reproducible operator scenario, a clear view of reusable assets, and a prioritized list of integration gaps.

**Do not:** Encode final operating policy or customer/provider terms that Contracts, Compliance, Finance, or business owners have not approved.

### 5.5 Mamadou Aliou Diallo — AI & Data Engineering

**Existing ownership profile:** AI/Data Engineer

**POC:** AI evaluation, guardrail, and audit expansion.

**Objective:** Evaluate the existing AI orchestration slice under realistic failure and safety conditions while remaining model- and provider-neutral.

**Work items:**

- Extend the existing evaluation suite with tenant-leakage, prompt-injection, malformed-output, model/tool outage, low-quality data, and unsupported-decision scenarios.
- Demonstrate schema validation, safe fallback, human escalation, and an auditable decision record.
- Record quality, latency, and cost proxies using synthetic inputs.
- Propose the boundary between deterministic business rules, AI assistance, and mandatory human approval.
- Identify candidate MCP/tool interfaces but do not connect them to live systems or grant write authority.

**Evidence of success:** Evaluation results are repeatable, failures are visible, unsafe output is contained, and reviewers can inspect the input, output, model/tool metadata, and human-decision path.

**Do not:** Allow AI to activate providers, approve refunds, change contractual status, make final compliance decisions, or access data across tenants.

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

## 8. Suggested five-day readiness sprint

| Day | Team activity | Expected output |
|---|---|---|
| 1 | Repository orientation and POC definition | Problem, scope, success criteria, assumptions, applicable rules |
| 2 | Design and focused test/evaluation setup | Small design note and initial evidence |
| 3 | Smallest implementation | Runnable local slice using synthetic data |
| 4 | Verification and peer review | Exact results, findings, fixes, limitations |
| 5 | Demonstration and recommendation | Demo, draft PR, recommendation, open-decision list |

Keep scope small enough to complete the Implementation Loop. If a POC cannot be completed in five days, reduce the question rather than bypassing evidence.

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
