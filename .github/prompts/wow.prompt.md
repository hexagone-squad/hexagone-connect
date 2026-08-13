---
name: wow
description: Course-correct work into an evidence-driven Implementation Loop with strict prerequisite and evidence gates.
---

Accepted forms:

- `/wow`
- `/wow --accept`
- `/wow <task-name>`
- `/wow --accept <task-name>`

Run `pnpm run workflow:wow -- {{input}}`.

Behavior rules:

- `--accept` skips only initial plan confirmation.
- `--accept` must never bypass evidence, security, irreversible-operation, audit, or ambiguity gates.
- If implementation occurs before BEFORE evidence, record ordering violation and require `late-before` capture with PR-summary limitation.
- Stop when prerequisites are missing and print exact remediation commands.
- Never request secrets in chat.
