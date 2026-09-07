# CLAUDE.md

Multilingual product catalog website (Thai / English / Simplified Chinese) with a full admin CMS.
Self-hosted, Docker, one small VPS behind Cloudflare, at **cidapt.com**. Visitors browse; they never
buy on the site. Every product CTA hands off to a LINE Official Account where a human closes the
sale.

Read `docs/SPEC.md` for the full specification and `docs/DESIGN.md` before writing any UI.
Both are authoritative. This file is the summary you carry between sessions.

## Stack

Next.js 15 (App Router, TypeScript strict) · Postgres 16 · Drizzle ORM · next-intl · Auth.js v5
(admin only) · Tailwind v4 · shadcn/ui · Tiptap · sharp · Zod · Caddy · Cloudflare · Docker Compose ·
Node 22.

One Next.js process serves the storefront, the admin, and the API. No separate backend service.

## Commands

```
docker compose -f docker-compose.dev.yml up   # full local stack, seeded, localhost:3000
pnpm dev                                       # app only, against a running db
pnpm db:generate / db:migrate / db:seed        # drizzle-kit
pnpm typecheck / lint / test                   # must all pass before a phase is done
pnpm test:e2e                                  # playwright
```

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

## Resource reality

The target VPS is 6 GB RAM / 4 cores / 60 GB disk. A production Next.js build alongside Postgres
will OOM on that box — build images in CI and pull them. Postgres is capped at 1.5 GB, the web
container at 1 GB. Disk is the real constraint: images get converted to AVIF/WebP at three sizes on
upload, originals over the threshold are dropped, and the admin dashboard shows disk usage.

## Working agreement

- Work through the phases in `docs/SPEC.md` §12, one at a time. Run `/phase <n>` to start one.
- **Stop at the end of each phase.** Run the verification for that phase, report what passed and what
  didn't, and wait. Do not roll into the next phase unprompted.
- If a decision isn't covered by SPEC.md or DESIGN.md, ask rather than picking. The `[DECIDE]` and
  §14 items are open on purpose.
- Conventional commits. Every phase ends on a green typecheck, lint, and test run.
- When you learn something durable about this codebase — a gotcha, a convention we settled on —
  append it under "Learned" below rather than leaving it in the conversation.

## Learned

_(empty — append as we go)_
