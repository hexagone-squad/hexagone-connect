---
description: AI orchestration, evaluation, privacy, and human-approval safeguards.
applyTo: 'ai/**,services/ai-orchestration/**'
---

Read `docs/methodology/CONSTITUTION.md` first.

- Route product model access through `ai-orchestration`; do not add direct vendor SDK usage elsewhere.
- Version prompts, models, tools, datasets, and evaluation cases.
- Validate AI inputs and outputs against schemas, enforce tool authorization, and record audit evidence.
- Test timeout, policy-denial, and provider-failure fallbacks.
- Obtain human approval before a consequential AI action is enabled.
