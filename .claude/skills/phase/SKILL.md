---
name: phase
description: Run one numbered build phase from docs/SPEC.md §12 — plan it, build it, verify it, then stop and report. Use when starting or resuming work on a phase of this project.
---

# Run build phase $ARGUMENTS

You are executing **one** phase of the build plan. Not the next one. Not part of the next one.

## 1. Orient

Read, in this order:

1. `docs/SPEC.md` §12 — find the row for phase $ARGUMENTS: its deliverable and its verification.
2. The SPEC sections that phase depends on. Phase 1 needs §6 and §7; phase 4 needs §6 and §9;
   phase 7 needs §5, §10, and all of `docs/DESIGN.md`; and so on.
3. `docs/DESIGN.md` in full if the phase touches any UI.
4. `CLAUDE.md` → "Learned", for anything earlier phases discovered.

Then check the repo state. Earlier phases may be partly done, or done differently than the spec
assumed. Reconcile against what exists rather than what the spec predicted.

## 2. Plan before writing

State, in a few lines:

- what you will build
- which files you will create or change
- anything in the spec that is ambiguous, contradicts existing code, or is missing

If something is genuinely underspecified, **ask now**. A wrong guess in phase 1 costs a migration in
phase 6. The `[DECIDE]` markers and §14 open questions are unanswered on purpose — if the phase
depends on one, stop and ask rather than picking a default and burying it.

## 3. Build

Follow the non-negotiables in `CLAUDE.md`. In particular: no hard-coded colors, URLs, or contact
details; Thai admin copy; Server Actions with shared Zod schemas; audit log on every mutation.

Keep the diff scoped to this phase. Do not refactor adjacent code you happen to notice, do not add
features from later phases because they are "easy while I'm here", and do not scaffold placeholder
files for work that isn't scheduled yet.

## 4. Verify

Run all of these and paste the real output — never assert a pass you did not observe:

```
pnpm typecheck
pnpm lint
pnpm test
```

Then run the phase-specific verification from the §12 table. Some are commands; some need you to
actually exercise the behavior (upload a file and check the derivatives exist, change a setting and
confirm the public page reflects it without a rebuild). Do the real check.

## 5. Report and stop

Report:

- what was built, as a short list of files
- verification results, including anything that failed
- decisions you made that the spec did not cover
- anything the next phase should know

Then append durable findings to the "Learned" section of `CLAUDE.md` and **stop**. Do not begin the
next phase. Wait for the human to review and say go.
