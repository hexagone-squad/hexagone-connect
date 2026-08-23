# Synthetic work-qualification queue

> **Status:** POC / TRAINING / NOT FOR PRODUCTION

## Problem

The repository has a work-management qualification use case and in-memory
adapters, but the admin portal is only an application shell. This POC tests
whether an operator-facing queue can exercise that existing use case without
copying its domain rules or treating an unapproved workflow as production
policy.

## Success criteria

- An operator can view and qualify synthetic submitted work requests.
- Empty, loading, validation, authorization, and service-failure states are
  visible and accessible.
- A successful action displays its correlation identifier and a synthetic audit
  timeline entry.
- Automated tests exercise the real work-management qualification use case and
  keyboard-capable interactions.

## Scope and assumptions

The POC uses synthetic, in-memory data for one operator and one tenant. It
assumes qualification is an operator-triggered action only to exercise the
existing use case. Business owners must confirm the eventual roles, queue
ordering, qualification criteria, and audit-retention policy.

The POC does not define provider activation, complaints, refunds, event
completion, production identity, persistence, or deployment behavior.

## Design and reuse assessment

The admin portal uses React 19 and Fluent UI React v9 components and design
tokens for presentation, with a reusable hook around a framework-independent
queue controller. A fetch adapter maps the
operator workflow to the versioned API gateway contract; the React view does not
import or execute work-management code.

The qualification feature is organized under `src/features/qualification-queue`:

- `QualificationQueuePage` is the feature container and composition boundary.
- `useQualificationQueueViewModel` owns UI orchestration and command state.
- Header, panel, content, request-card, and activity components are presentational.
- `qualification-queue.styles.ts` owns shared Fluent design-token styling.
- `index.ts` is the feature's public React API.

The API gateway owns authentication, tenant authorization, input validation,
and safe HTTP error mapping. It delegates qualification to work management and
does not redefine Joy's create-work-request operation or domain rules.

## Applicable constraints and evidence

- `HC-SEC-001`: only synthetic data is used.
- `HC-SEC-002`: attempted cross-tenant qualification is denied before use-case
  execution.
- `HC-ARCH-001`: presentation depends on an adapter interface; domain rules stay
  in work management.
- `HC-TEST-001`: focused smoke and accessibility tests cover success and failure
  states.
- `HC-DOC-001`: this document records setup, limitations, and the shell reuse
  decision.
- `SC-A11Y-001`: automated accessibility results are recorded; keyboard and
  screen-reader review remain human evidence.

## Operations and limitations

All state resets when the POC process reloads. Correlation and audit entries are
synthetic and are not durable operational records. The POC must not receive
customer, provider, identity, payment, or event-production data.

## Run the POC

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm --filter @hexagone/api-gateway start
```

In a second terminal:

```bash
pnpm --filter @hexagone/admin-portal dev
```

Open `http://127.0.0.1:5173/`. Use **Demo scenario** to reproduce the ready,
empty, authorization, and service-failure states. In the ready state, activate
**Qualify request** to display the correlation identifier and audit timeline.

Stop the Vite process with `Ctrl+C`. No persistent data or cloud resources need
cleanup. Stop the API gateway process separately.

For a deployed environment, serve the browser and gateway behind the same
origin and reverse-proxy `/api/*` to the gateway after stripping the `/api`
prefix. Do not expose the synthetic bearer fixture outside local POC use.

## Verification evidence

The pre-change admin portal exported only its application name and had no
runnable page, so a meaningful BEFORE screenshot was not applicable. The
focused precondition test failed because the qualification queue module did not
exist.

Run the deterministic focused checks:

```bash
pnpm --filter @hexagone/admin-portal test
pnpm --filter @hexagone/admin-portal build
pnpm exec vitest run tests/integration/api-gateway-work-qualification.test.ts
pnpm run test:e2e
pnpm run test:a11y
```

The browser specification covers keyboard activation, correlation and audit
output, empty/authorization/service states, a mobile viewport, and Axe rules.
Desktop and mobile AFTER screenshots are generated as review evidence outside
the shared repository. Keyboard behavior is automated; screen-reader and
assistive-technology checks remain `not run` pending human review.

## Recommendation

Reuse the existing work-management use case and keep the UI adapter narrow.
Defer a gateway endpoint, production queue source, identity integration, and
audit persistence until their contracts and requirements are approved.
