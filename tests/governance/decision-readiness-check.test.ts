import { describe, expect, it } from 'vitest';
import { validateDecisionReadinessRegister } from '../../scripts/check-governance.js';

describe('decision readiness register validation', () => {
  it('accepts a complete decision register table', () => {
    const content = `# Decision Readiness Register

| Decision ID | Current evidence | Missing business input | Options | Decision owner | Required POC | Status | Review date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DR-001 | ADR-0002 and architecture tests | Capacity targets from operations | Monolith-first or service split | Technology Lead | Tenant boundary matrix | Open | 2026-09-01 |
`;

    expect(() => validateDecisionReadinessRegister(content)).not.toThrow();
  });

  it('rejects incomplete decision register values', () => {
    const content = `# Decision Readiness Register

| Decision ID | Current evidence | Missing business input | Options | Decision owner | Required POC | Status | Review date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DR-001 | ADR-0002 and architecture tests | Capacity targets from operations | Monolith-first or service split | Technology Lead | Tenant boundary matrix | Open | 2026-09-01 |
| DR-002 | ADR-0003 | - | Minimal or configurable retention | Technology Lead | Redaction tests | Open | 2026-09-08 |
`;

    expect(() => validateDecisionReadinessRegister(content)).toThrow('incomplete value');
  });

  it('rejects reordered header cells', () => {
    const content = `| Current evidence | Decision ID | Missing business input | Options | Decision owner | Required POC | Status | Review date |
| --- | --- | --- | --- | --- | --- | --- | --- |`;

    expect(() => validateDecisionReadinessRegister(content)).toThrow('required table header');
  });

  it('rejects extra header text', () => {
    const content = `| Decision ID (required) | Current evidence | Missing business input | Options | Decision owner | Required POC | Status | Review date |
| --- | --- | --- | --- | --- | --- | --- | --- |`;

    expect(() => validateDecisionReadinessRegister(content)).toThrow('required table header');
  });

  it('rejects a missing separator row', () => {
    const content = `| Decision ID | Current evidence | Missing business input | Options | Decision owner | Required POC | Status | Review date |
| DR-001 | Evidence | Input | Option | Owner | POC | Open | 2026-09-01 |`;

    expect(() => validateDecisionReadinessRegister(content)).toThrow('valid table separator');
  });

  it('accepts a header-only register with no open decisions', () => {
    const content = `| Decision ID | Current evidence | Missing business input | Options | Decision owner | Required POC | Status | Review date |
| --- | --- | --- | --- | --- | --- | --- | --- |`;

    expect(() => validateDecisionReadinessRegister(content)).not.toThrow();
  });
});
