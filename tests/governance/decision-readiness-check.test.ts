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
| DR-001 | ADR-0002 and architecture tests | - | Monolith-first or service split | Technology Lead | Tenant boundary matrix | Open | 2026-09-01 |
`;

    expect(() => validateDecisionReadinessRegister(content)).toThrow('incomplete value');
  });
});
