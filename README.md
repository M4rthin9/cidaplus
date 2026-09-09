# cidaplus

Multilingual product catalog website (Thai / English / Simplified Chinese) with a full admin CMS.
Self-hosted, Docker, one small VPS behind Cloudflare, at **cidapt.com**. Visitors browse; they never
buy on the site. Every product CTA hands off to a LINE Official Account where a human closes the sale.

Read `docs/SPEC.md` for the full specification and `docs/DESIGN.md` before writing any UI.

## Stack

Next.js 15 (App Router, TypeScript strict) · Postgres 16 · Drizzle ORM · next-intl · Auth.js v5
(admin only) · Tailwind v4 · shadcn/ui · Tiptap · sharp · Zod · Caddy · Cloudflare · Docker Compose ·
Node 22.

## Quick start

```bash
docker compose -f docker-compose.dev.yml up   # full local stack, seeded, localhost:3000
```

This brings up Postgres plus the app and seeds the content. The database itself uses
`pnpm db:migrate`. The seed is idempotent — `pnpm db:seed` may be re-run safely.

## Commands

```bash
docker compose -f docker-compose.dev.yml up   # full local stack, seeded, localhost:3000
pnpm dev                                       # app only, against a running db
pnpm db:generate / db:migrate / db:seed        # drizzle-kit
pnpm typecheck / lint / test                   # must all pass before a phase is done
pnpm test:e2e                                  # playwright
pnpm admin:create <email> <name> [owner|editor]   # create or reset an admin (see below)
```

### Windows PowerShell gotchas

- **Use `pnpm.cmd`, not `pnpm`.** The `pnpm.ps1` shim is blocked by the default execution
  policy. `pnpm admin:create` fails with `ELIFECYCLE Command failed with exit code 2` — that is the
  script rejecting a missing password, not a sign of failure.
- **Host scripts cannot reach Docker's `db` hostname.** `.env` sets
  `DATABASE_URL=postgres://cida:cida@db:5432/cida`, which only resolves inside the compose
  network. Running `db:*` / `admin:create` on the host fails with `getaddrinfo ENOTFOUND db`.
  Override it against the published port (the dev DB's real credentials match the web container, not
  `.env`):

  ```powershell
  $env:DATABASE_URL='postgres://cidapt:cidapt_dev@localhost:5432/cidapt'
  ```

  Since the env var is read while `.env` is loaded with `--env-file-if-exists`, set it **after** a
  `.env` is present — the process env wins over the file.

- **`db:seed` does not create an admin, and `db:migrate` covers the catalog tables.** If
  `admin:create` reports `column "session_version" does not exist`, the running database was
  migrated before migration `0001` existed. Apply the missing columns with `ALTER TABLE ... IF NOT
  EXISTS` (they all have defaults), then re-run `admin:create` as an update.

## Admin user seed

The admin user is **not** created by `pnpm db:seed` — that script only seeds catalog content
(categories, products, posts, locales) and deliberately never touches the `users` table. The first
admin is bootstrapped separately with `pnpm admin:create`, so the password never lives in a seed
file or shell history.

```powershell
# PowerShell: env var first, then the .cmd shim
$env:ADMIN_PASSWORD='set-a-strong-password'
$env:DATABASE_URL='postgres://cidapt:cidapt_dev@localhost:5432/cidapt'
pnpm.cmd admin:create admin@cidapt.com "ผู้ดูแลระบบ" owner
```

- Password is read from the `ADMIN_PASSWORD` environment variable, not given as an argument, so it
  never lands in shell history.
- `email` and `name` are required; `role` defaults to `owner` (the other option is `editor`).
- Re-running the command on an existing email **resets the password**, reactivates a deactivated or
  locked account, clears failed-login attempts, and revokes existing sessions (bumps
  `session_version`). This is the runbook's "I am locked out" path. The output `updated existing
  admin …` is success, not an error.
- It writes an `audit_log` row either way.

## Non-negotiables

- **Never hard-code the LINE URL, phone number, email, or any color.** They live in the `settings`
  table and reach components as typed settings or CSS custom properties. One source of truth each.
- **Never hard-code a hex value in a component.** Use the tokens in `docs/DESIGN.md`.
- **Translatable text lives in `*_i18n` tables**, never in `name_th` / `name_en` columns. Thai is the
  fallback for every locale. Adding a language is a row insert, not a migration.
- **Never machine-translate content.** Seed and placeholder copy is Thai-only on purpose; English and
  Chinese wait for a human.
- **The contact form writes to the database before it tries to email.** SMTP is not configured yet
  and the form must still work — losing an enquiry is the worst failure this site can have.
- **No hotlinked assets.** The logo and every image live in the repo or the media library.
- **Thai typography is correctness, not taste.** Body `line-height: 1.8`, `letter-spacing: 0` on all
  Thai text, extra vertical padding on buttons. Test every layout at 360px width.
- **All admin-facing copy is Thai** — labels, buttons, toasts, validation, empty states.
- **Server Actions for every mutation**, with the same Zod schema the form uses. No ad-hoc fetch to
  our own API. `revalidateTag` after writes.
- **Every mutation writes an `audit_log` row** with a field-level diff.
- **Soft delete** on categories, products, posts, media. Check usage before allowing a delete.
- **Sanitize Tiptap JSON server-side.** Never `dangerouslySetInnerHTML` on stored content.
- No `any`, no non-null assertion without a comment justifying it.
