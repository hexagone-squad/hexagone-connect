# Engineering methodology

This repository follows an evidence-driven engineering model. The goal is to reduce accidental risk while preserving clear ownership, service boundaries, and operational readiness.

## Core principles

### 1. Evidence before acceptance

Every requirement, architecture decision, implementation change, security claim, and release must be supported by verifiable evidence.

### 2. Boundaries before convenience

Services are designed around explicit ownership, local data control, and clear contract boundaries.

### 3. Contract-first design

APIs and events are treated as contracts that must be versioned, validated, and reviewed.

### 4. Security and privacy by default

Tenant isolation, least privilege, minimal data access, and auditable behavior are mandatory.

### 5. Human accountability for AI-assisted work

AI can assist with generation, analysis, and validation, but humans remain accountable for final decisions and operational outcomes.

## Delivery flow

1. Define the requirement or feature intent.
2. Validate the architecture and service boundary fit.
3. Create or update the contract and relevant tests.
4. Implement the smallest credible change.
5. Run the applicable checks, including tests and evidence validation.
6. Confirm the operational and security implications are documented.
7. Complete release evidence before sign-off.

## Quality gates

The repository expects the following controls to be satisfied before merge or release:

- automated tests relevant to the change
- contract verification where APIs or events are involved
- security and privacy checks where required
- traceability to the relevant architecture and governance documents
- operational readiness review for production-facing changes

## Review expectations

Changes should be reviewed against:

- architecture direction
- tenant isolation and security impact
- contract compatibility and event versioning
- implementation quality and evidence trail
- operational recovery and rollback implications

## Evidence artifacts

Examples of evidence include:

- tests and validation outputs
- contract verification results
- architecture decision records
- release checklists or status notes
- security and privacy review notes
- runbook and recovery references

## Definition of done

A work item is not done when code is complete; it is done when the behavior is validated, the evidence exists, and the operational and governance impacts are documented.
