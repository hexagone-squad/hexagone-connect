# /wow Evidence Classification

This document defines how `/wow` selects acceptable evidence for each change surface.

## Classification matrix

| Surface | Required evidence method |
| --- | --- |
| UI | Comparable before/after screenshots or recordings plus focused test outputs. |
| API/server/data | Failing then passing requests or tests from the same scenario. |
| AI/agent/routing/prompt | Identical before/after prompts, transcripts, tool trajectories, and outputs. |
| Accessibility | Programmatic state evidence plus focused accessibility test results. |
| Security | Reproduction evidence, patched behavior, and regression tests. |
| Performance | Comparable timing or profiler output with the same command and data shape. |
| Telemetry | Missing or malformed event evidence, then corrected event-shape evidence. |
| CI/build/config/docs | Failing then passing command output or rendered diff evidence. |
| Infrastructure | Rendered plan/template output and platform validation evidence. |

## Ordering rule

Every non-trivial change requires BEFORE and AFTER evidence.

If implementation occurred before BEFORE evidence, `/wow` must:

1. mark the ordering violation;
2. require `late-before` capture;
3. require explicit limitation disclosure in PR summary.

`late-before` does not replace true pre-change evidence.
