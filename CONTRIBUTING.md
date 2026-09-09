# Contributing

Feedback, bug reports and clean pull requests are welcome. Before you open one,
understand what this repo is:

- **cidapt.com is a live production site.** Main is what ships. Every change lands
  green or not at all.
- **`docs/SPEC.md` and `docs/DESIGN.md` are authoritative.** If a decision is not
  covered there, ask rather than inventing it — the `[DECIDE]` and §14 items are
  open on purpose.
- **This is a single-writer project.** Phases are built one at a time through the
  `/phase` skill. If you are proposing something new, a short issue first beats a
  long PR that lands in the wrong place.

## Workflow

1. Open an issue describing the change (bug or feature).
2. Branch off `main` with a short descriptive name.
3. Make the change. Follow the conventions in `CLAUDE.md`:
   - No `any`, no non-null assertion without a justifying comment.
   - Server Actions for every mutation, with the same Zod schema the form uses.
   - Every mutation writes an `audit_log` row with a field-level diff.
   - Thai is the fallback for every locale; translatable text lives in `*_i18n`
     tables, never in `name_th`/`name_en` columns.
   - Never machine-translate content. English and Chinese copy wait for a human.
   - Never hard-code the LINE URL, phone number, email, or any hex colour.
4. Verify locally before pushing:
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm format:check
   pnpm test
   ```
   `pnpm format:check` runs against LF line endings; a Windows checkout needs
   `.gitattributes` normalisation to avoid false failures.
5. Commit with a conventional message (`feat:`, `fix:`, `docs:`, `chore:`, …).
6. Open the PR. The CI job runs the same four checks plus migrate, seed and build
   against a Postgres service container.

## Don't

- Don't build on the target VM. Images are built in CI (`release.yml`) and pulled.
- Don't commit `.env` — `next build` would copy it into the standalone output.
- Don't reflow `docs/SPEC.md` or `docs/DESIGN.md`; they are hand-aligned prose and
  tables, and prettier deliberately ignores `docs/`.