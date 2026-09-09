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

**Phase 0**

- **`next build` copies `.env` into `.next/standalone/.env`,** and the standalone server loads it
  from there. Two consequences. First, a CI image built on a checkout that has a `.env` ships those
  secrets inside the image — §11 builds in CI and pulls on the VPS, so the CI job asserts `.env` is
  absent before `pnpm build` (`.github/workflows/ci.yml`). Verified both ways: the guard exits 1 when
  a `.env` is present, and a build with one really does copy the secret into
  `.next/standalone/.env`. Second, it makes local fail-fast testing lie: the server picks up
  the baked file even when the variable is unset in the environment. Delete `.env` and rebuild
  before testing env validation.
- **Next catches a throw from `instrumentation.register()`** and keeps the process alive serving
  500s — the container stays "running", so `restart: unless-stopped` never fires and the only
  symptom is a dead site. `src/instrumentation.ts` therefore logs and calls `process.exit(1)`
  instead of letting the error propagate.
- **Tailwind v4 `@theme` is the right home for the DESIGN.md tokens.** Utilities compile to
  `var(--color-*)`, so phase 6 can override the custom properties on `<html>` from `settings.theme`
  and the whole site retunes with no rebuild. Nothing in `globals.css` needs to change for that.
- `eslint-config-next` 15 is still eslintrc-shaped; the flat config goes through `FlatCompat` from
  `@eslint/eslintrc`. Keep `eslint` on 9.x — `eslint-config-next` 15 does not declare support for 10.
- Prettier does not touch `docs/` or any `*.md`. SPEC.md and DESIGN.md are authoritative,
  hand-aligned prose and tables; reflowing them churns the diff and breaks the table columns.
- Pinned exact versions everywhere, no ranges. The box is rebuilt rarely and debugged remotely, so
  a silent minor bump months from now is a bad trade for freshness.

**Phase 1**

- **`settings` uses a `'*'` sentinel for locale, not NULL.** §6 specifies `PK(key, locale)` with
  "locale NULL = applies to all locales", which cannot exist — Postgres forces every primary-key
  column NOT NULL. The sentinel keeps the PK real and lookups a plain equality; a nullable column
  under a unique index would also have let duplicate global rows through, since NULL never equals
  NULL. `GLOBAL_LOCALE` in `src/db/schema/settings.ts` is the only place that spells it.
- **uuid v7 is generated application-side.** PG16 has no `uuidv7()` (PG18 added it) and
  `pg_uuidv7` is not in `postgres:16-alpine`. `primaryId()` in `src/db/schema/shared.ts` is the
  single place that decides, so a future PG upgrade is one edit.
- **Every `*_i18n.locale` is a real FK to `locales.code`.** That is what makes "adding a language is
  a row insert" true rather than aspirational — an unknown locale is rejected by the database.
- **The seed is idempotent by hard-deleting `is_seed` rows first,** not by upserting. Children
  cascade from their parents, so only `posts`, `products` and `categories` need deleting. Verified
  clean across three consecutive runs with identical counts and zero orphans.
- **`locales` rows are deliberately not seed-flagged.** They are configuration, not sample content;
  the admin's "purge seed data" button must never remove the site's languages.
- **No `revisions` table** — SPEC §14 decision 12. `audit_log` is the history.
- Seeded products carry **no media rows**. The sharp pipeline is phase 3, and rows pointing at files
  that do not exist would make the media library lie. It also means the "no photograph yet" empty
  state (docs/DESIGN.md) is exercised from day one, which is the state that will ship longest.
- Local Postgres 16.13 is installed on this box, so phases can be verified without Docker:
  `initdb -D /tmp/pgdata -U cida --auth=trust` then `pg_ctl -D /tmp/pgdata -o '-p 5432 -k /tmp' start`.
  After a container restart the data directory survives but the server does not — check for
  `/tmp/pgdata/base` and only run `pg_ctl start`. Re-running `initdb` would wipe the cluster.

**Phase 2**

- **Auth.js cannot do database sessions with the credentials provider.** `@auth/core` asserts
  "Signing in with credentials only supported if JWT strategy is enabled", so §3's original wording
  was unbuildable. Sessions are JWT; revocation comes from `users.session_version`, compared in
  `requireAdmin()`. Bump it whenever access changes — deactivate, password change, role change.
- **The middleware is not the security boundary.** It runs on the edge runtime where neither
  `@node-rs/argon2` (native) nor the postgres driver can load, so it only proves a cookie parses.
  `requireAdmin()` / `requireOwner()` in `src/lib/auth/session.ts` is authoritative, and every admin
  page and server action must call it. Verified: the middleware bundle contains no argon2, postgres
  or drizzle code.
- **`declare module` silently no-ops when the specifier is unresolvable.** `@auth/core` is a
  transitive dep and pnpm's strict layout does not hoist it, so `declare module "@auth/core/jwt"`
  created a *new* ambient module instead of augmenting the real one — with no error. It is now a
  direct devDependency pinned to the exact version next-auth resolves. Augmenting `next-auth/jwt`
  does nothing: it is a bare re-export of `@auth/core/jwt`.
- **`JWT extends Record<string, unknown>`,** so inside the config's own callback types the augmented
  claims widen back to `unknown`. The `session` callback annotates `token: JWT` explicitly.
- **`Algorithm` from `@node-rs/argon2` is a `const enum`,** which `isolatedModules` forbids
  importing as a value. The numeric member is spelled out and asserted by a test on the
  `$argon2id$` digest prefix.
- **Audit diffs redact `passwordHash`, `password` and `sessionVersion`** but still record that the
  field changed, so a rotation is auditable without the material reaching the table. Verified
  against real Postgres: zero audit rows contain an argon2 string.
- **`writeAudit` takes the executor** so it joins the caller's transaction. An audit row that
  survives a rolled-back mutation is a lie.
- Failed logins for an unknown email still run a real argon2 verify against a decoy digest, so
  response time cannot enumerate accounts.
- Do not use `pkill` in this session — it kills the agent's own shell.

**Phase 3**

- **AVIF encoder effort is the single most expensive number in the pipeline.** Measured here on one
  1600px rendition: effort 4 = 10 978 ms / 117 KB, effort 2 = 1 689 ms / 125 KB, effort 0 = 369 ms /
  200 KB. `AVIF_EFFORT = 2`. Effort 4 costs 6.5x the time for 7% smaller files inside a Server
  Action on a 4-core VPS shared with Postgres.
- **Derive everything from the capped master, never from a full-size intermediate.** Holding an
  uncompressed full-size buffer cost 21s and ~100 MB on the 5906x5906 seal; decoding once into the
  2400px master and deriving from that is 6.7s. `MASTER_MAX_WIDTH` must stay >= the largest
  derivative width or this silently starts upscaling.
- **Next caps Server Action bodies at 1 MB by default,** which silently swallowed every real photo
  upload — §13's 10 MB limit was unreachable. `serverActions.bodySizeLimit` is now 24mb, and the
  upload form refuses an oversized batch client-side, because Next rejects the body before any of
  our code runs so the failure would otherwise be invisible.
- **`sharp.format.avif` is absent; AVIF lives under `sharp.format.heif` with an `avif` alias.**
  Checking the former says AVIF is unsupported when it works fine.
- **sharp reports the focal point as `attentionX` / `attentionY` in source pixels.** `cropOffsetLeft`
  is in output space and negative — it is not the field you want.
- **Split client-safe URL helpers from filesystem code.** `node:path` / `node:crypto` in a module a
  client component imports fails the webpack build. `src/lib/media/urls.ts` is pure and importable
  anywhere; `storage.ts` carries `import "server-only"` so the boundary is enforced. Vitest aliases
  `server-only` to `test/server-only-stub.ts`, since it throws by design outside a Server Component.
- **`output: "standalone"` does not copy `.next/static` or `public/`.** Both must be copied beside
  `server.js` or every asset 404s and the app runs unhydrated. Phase 11's deploy script must do this.
- Testing gotcha: the admin layout's sign-out button precedes page content in the DOM, so a bare
  `button[type="submit"]` selector clicks *sign out*. Scope form clicks, e.g.
  `form:has(#files) button[type="submit"]`.
- Playwright 1.57 expects Chromium build 1200; this image ships 1194 at
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. Launch with an explicit `executablePath`.
- `/proc/<pid>/comm` truncates to 15 chars, so `next-server (v15.5.25)` reads as `next-server (v1`.
  Match on `/proc/<pid>/cmdline` when hunting a stray dev server — and never `pkill`.

**Phase 4**

- **`z.string().optional().or(z.literal("").transform(() => undefined))` does not turn "" into
  undefined.** The empty string satisfies the *first* branch, so the union never reaches the
  transform and "" is written verbatim — which for a nullable foreign key is a constraint violation,
  not a null. This 500'd category creation. Use `z.preprocess` to strip "" before validation;
  `optionalString()` in `src/lib/validation/catalog.ts` is the one place that does it. `env.ts`
  escapes the bug only because its first branch carries `.min(1)`, so "" fails it.
- **Slugs are Thai UTF-8** (§14 decision 17). `slugify` keeps the Thai block and ASCII
  alphanumerics; U+200B is a *word boundary* in Thai (no spaces between words) so it becomes a
  hyphen, while ZWNJ/ZWJ/BOM are stripped as invisible.
- **A 301 is only written when the entity was already published** — an unpublished draft has no
  public URL to redirect from. `recordSlugRedirect` also re-points existing rows at the new target
  so a rename chain stays one hop, and deletes any row that would redirect to itself.
- **dnd-kit ships English screen-reader announcements that read out raw UUIDs.** Every admin-facing
  string is Thai, and a screen reader is admin-facing, so `DndContext` gets Thai `announcements` and
  `screenReaderInstructions` built from the category names.
- Testing gotcha: dnd-kit keyboard sorting needs a beat between key presses. Space → ArrowDown →
  Space fired back-to-back silently does nothing; ~400ms between them works. Mouse drag needs
  intermediate `mouse.move` steps to clear the 4px activation constraint.
- `products.sort_order` is ordered **within a category**, since products are listed per category.
  New products sort last.
- Server actions called from a client component inside `startTransition` do refresh the RSC payload,
  so `revalidatePath` updates props with no manual reload — verified by a bulk unpublish changing
  the table's state column in place.

**Phase 5**

- **The rich-text whitelist rebuilds, it does not filter.** `sanitizeDoc` constructs a new document
  copying only known node types, marks and attributes; anything unrecognised is never copied, so a
  shape nobody anticipated cannot survive by going unnoticed. `richDocSchema` then validates the
  rebuilt result, so a bug in the rebuilder cannot widen what reaches the database. Verified by
  submitting a hostile body through the real form: zero rows contain `javascript:`, `onclick`,
  `script`, `rawHtml`, `onerror` or an external image URL.
- **Rich-text images carry a `mediaId`, never a `src`.** An external image is therefore not
  expressible in the stored document at all. The action additionally drops any image whose media row
  is missing or soft-deleted — the sanitizer guarantees shape, only the database can confirm the
  image is real.
- **`src/lib/richtext/render.tsx` emits React elements, never an HTML string,** so there is nothing
  for a payload to be injected into even if the sanitizer were bypassed. Tested through
  `renderToStaticMarkup`: `<script>` in text comes out as `&lt;script&gt;`.
- **Vite 8 transforms with Oxc, not esbuild.** Next needs `jsx: "preserve"` in tsconfig, which makes
  Vite refuse `.tsx`; the override is `oxc: { jsx: "automatic" }` in `vitest.config.mts`
  (`esbuild: { jsx }` is silently ignored). Needed to test any component.
- Heading levels are clamped to 2–3 rather than rejected, so a pasted h1 degrades instead of failing
  the save — an h1 in the body would compete with the page title.
- A link mark with an unsafe scheme drops the *mark*, keeping the text. Losing the words because the
  URL was bad would be worse than losing the link.

**Phase 6**

- **Two caches sit on the settings read and each earns its place.** `TtlCache` (60s, §6) keeps one
  server process off the database on every render; Next's tagged cache lets public pages stay
  statically rendered. A write does both — `bustSetting(key)` then
  `revalidateTag(SETTINGS_TAG)` — and skipping either leaves a stale colour on the site.
- **A settings read never throws.** §6 requires a missing row to fall back to its default; the same
  applies to an unreachable database, so `getSetting` catches and returns defaults. That is also what
  lets `next build` prerender without a database, which §11's build-in-CI-and-pull flow needs.
- **A key stores its structural half at `'*'` and its copy per locale, merged on read** (§14 decision
  19). Verified in the database: `line` is two rows, `{oaId}` at `*` and
  `{buttonLabel, messageTemplate}` at `th`, with nothing duplicated.
- **Theme reaches the site as a React `style` object on `<html>`,** not a CSS string — the values are
  operator input, and this keeps them out of `dangerouslySetInnerHTML` territory entirely. Tailwind
  v4 compiles every utility to `var(--color-*)`, so nothing in `globals.css` changes.
- The theme editor shows **live WCAG contrast ratios** for the pairs that carry text and warns when
  any falls below 4.5:1, because Thai public-sector guidance makes AA a compliance floor rather than
  a target. It warns rather than blocks — the operator may have a reason, and a hard block on a
  colour picker is the kind of thing people work around by editing the database.
- `settings.line` stores the OA **handle**, not a URL (§14 decision 20). Phase 8 derives both link
  forms from it.


**Phase 7**

- **Thai is served unprefixed, other locales prefixed** (`localePrefix: "as-needed"`, §14 decision
  21). §5 says every public route is locale-prefixed, but `localePrefix()` in `src/lib/slug.ts` has
  returned `""` for Thai since phase 4 and every stored 301 points at that shape. The lasting
  benefit is that Thai URLs do not change on the day English is switched on.
- **`localeDetection` is off.** With it on, next-intl reads Accept-Language and redirects a visitor
  whose browser prefers English from `/` to `/en` — which `[locale]/layout.tsx` 404s, because `en`
  is disabled. A Thai government site must not 404 for anyone with an English browser. Turn it on in
  the same change that enables a second locale.
- **Locale enablement is a database read, not a constant.** `routing.locales` lists the URL shapes;
  `locales.is_enabled` decides which are live, checked in `[locale]/layout.tsx`. Verified both ways:
  `/en/...` 404s while the row is off, and flipping one boolean makes the whole English tree serve
  with Thai fallback content — no deploy, which is what §14 decision 9 promises.
- **There are two root layouts** (§14 decision 22): `app/[locale]/layout.tsx` for the storefront and
  `app/(admin)/layout.tsx` for the admin. A layout above a dynamic segment never receives that
  segment's params, so a single shared root could not put the locale in `<html lang>` without
  reading the request path and going dynamic on every page. Symptom before the split: `/en/...`
  rendered `lang="th"`.
- **React 19 resets an uncontrolled `<form action={…}>` once the action returns** — including when
  it returns validation errors. On the contact form that wiped every field the visitor had typed,
  on the one form whose whole purpose is not to lose an enquiry. The action now echoes the submitted
  strings back in its state and each field renders them as `defaultValue`; the reset then restores
  those instead of blanks. Verified by mistyping one field and correcting only that field.
- **`next build` bakes `unstable_cache` values into prerendered pages, and `.next/cache` survives
  between builds.** A settings row changed with raw SQL therefore does not appear even after a
  rebuild and a restart — the tag was never invalidated. Editing through the admin is fine (the
  action calls `revalidateTag`); when poking the database directly, `rm -rf .next` first.
- **Read `headers()` only when it changes the answer.** `SiteHeader` needs the request path to build
  the language switcher's per-locale hrefs, but reading it opts the route out of static rendering —
  so the call sits behind `locales.length > 1` and never happens while Thai is the only locale. The
  storefront's static routes stay `●` in the build output.
- **Anuphan is a variable font.** Google serves one file per unicode subset covering the whole
  100–700 weight axis, so 400/500/600 need two files, not six: `anuphan-thai.woff2` (19 KB) and
  `anuphan-latin.woff2` (35 KB), each declared `font-weight: 100 700` so the browser interpolates
  instead of synthesising a fake bold.
- **The homepage's LCP element is the hero seal,** and it was being discovered only after the CSS
  and HTML parsed — 819 ms of load delay on a 194 ms download. `Seal` with `priority` now emits a
  `<link rel="preload" as="image" type="image/avif">`, which React 19 hoists into `<head>`. AVIF
  only: a browser that cannot decode the type ignores the preload and falls through to the
  `<picture>` chain.
- **The site ships with no favicon on purpose,** so Lighthouse Best Practices is 96 rather than 100
  on every page (one missing-resource audit). docs/DESIGN.md requires a *simplified mark drawn on
  purpose* at icon sizes — the seal's two rings of Thai microtext are noise below ~96px and a maroon
  dot at 16px — and downscaling it is the treatment that file forbids. Blocked on the SVG master;
  phase 10 owns the icons.
- **A `page.tsx` may only export a component and Next's route config.** Exporting a helper from one
  fails the build; `unreadMessageCount` lives in `src/lib/admin/messages.ts`.
- UI chrome lives in `messages/th.json`; everything a reader sees as content — product names, the
  site name, the LINE button label, the PDPA note — stays in `*_i18n` and `settings`. A locale with
  no catalog falls back to Thai, mirroring §6's rule for content.
- Testing gotcha: matching `next-server` loosely against `/proc/*/cmdline` kills this agent's own
  shell, because the shell's command line contains the string it is searching for. Anchor it:
  `case "$c" in "next-server"*)`. Same failure mode as `pkill`, noted under phase 2.

**Phase 8**

- **`/go/line` lives under `[locale]`,** at `src/app/[locale]/go/line/route.ts`. §8 item 4 wants the
  visitor's locale on every `line_clicks` row, and a route segment is the only way to get it that
  cannot silently default — a query parameter can be dropped by whoever builds the link. Thai
  resolves at `/go/line` and other locales at `/<locale>/go/line`, matching the as-needed prefix
  scheme. The redirect is a **302, not a 301**: the target is derived from `settings.line`, and a
  permanently-cached redirect would outlive the operator changing the account.
- **`rel="noopener"`, never `noreferrer`, on the tracked LINE links.** Every LINE entry point now
  points at `/go/line` on our own origin, so `noreferrer` buys no isolation the same-origin policy
  does not already give — and it strips the `Referer` header, which is what §8 item 5 asks
  `line_clicks.referrer` to record. Measured: with `noreferrer` every row stored a null referrer and
  a useless path. The genuinely external links (Facebook, YouTube in the footer) keep both.
- **A `Date` interpolated into a raw `sql` fragment fails at bind time.** Inside
  `` sql`count(*) filter (where ${column} >= ${aDate})` `` drizzle has no column type to infer the
  parameter from, so postgres.js is handed a `Date` where it wants a string and the whole query
  throws `ERR_INVALID_ARG_TYPE`. Pass `.toISOString()` with an explicit `::timestamptz`. A `Date` in
  `where(gte(column, date))` is fine — that path is typed by the column.
- **Empty days come from `generate_series`, not from the chart.** A gap in a time axis is a
  different claim from a zero, and only the database knows which days fall in the window.
- **The dashboard chart is boxes, not SVG.** A responsive SVG has to choose between letterboxing and
  `preserveAspectRatio="none"`, and the latter scales columns, corner radii and labels horizontally
  — measured at 35px wide against a 24px cap, with visibly stretched type. In CSS the mark specs are
  real pixels at every width. Verified by screenshot at 1280px and at 360px.
- **Green on the click chart is the one sanctioned use.** docs/DESIGN.md reserves `--color-accent`
  for the LINE handoff and nothing else, and this chart is that handoff counted. One series, so no
  legend; the peak is the only direct label; the `<details>` table is the non-visual equivalent.
- **The GA4 event §8 item 5 asks for is deliberately not fired.** `/go/line` is a server redirect
  with no client to run `gtag` on, and §10 requires analytics to load only after PDPA consent, which
  is phase 10's banner. The `line_clicks` row is the durable signal either way; phase 10 can add the
  browser-side event once consent exists.
- **`line_clicks` retention is still unenforced.** §6 says a nightly cron prunes past 30 days; every
  query here already windows to `RETENTION_DAYS`, but nothing deletes. The cron is deploy tooling —
  phase 11.
- Testing gotcha, and the second time this has bitten: `form button[type="submit"]` in the admin
  clicks **sign out**, because the layout's sign-out form precedes page content. Scope it —
  `form:has(input[name="lineMessageOverride"]) button[type="submit"]`. Already recorded under phase
  3; recorded again because the phase-3 note names a different form.

**Phase 9**

- **`revalidatePath("/")` does nothing for a route that lives at `/[locale]`.** The cache entry is
  keyed by the *matched route*, not by the URL a visitor types, so a saved page sat in the database
  while the homepage kept serving its previous render. Use the route-pattern form —
  `revalidatePath("/[locale]", "page")`, and `revalidatePath("/[locale]", "layout")` for anything
  the header or footer renders. Measured both ways.
- **The section renderers must not import `server-only`.** A module with no directive is bundled
  into whichever graph imports it, so `src/components/sections/render.tsx` renders on the server for
  the public page *and* in the browser for the admin's live preview — the same components, which is
  the only way a preview is honest rather than merely plausible. Nothing in a section is interactive
  (the FAQ is `<details>`), so serving both graphs costs no public bundle.
- **The preview loads a superset once and narrows it in the browser.** `loadPreviewBase` fetches
  every published category, 24 featured products and 12 posts; `buildPreviewData` applies the same
  filters `loadSectionData` applies in SQL. That is what makes dragging a block repaint with no
  round trip. `ProductCardData` carries `categoryId` purely so the preview can apply a block's
  category filter exactly rather than approximately.
- **Sections and menus rebuild rather than filter,** like the rich-text whitelist. `sanitizeSections`
  and `sanitizeMenuItems` run on write *and* on public read, so a row written by an older version of
  the app cannot take a page down. Both structures are submitted as JSON from the builder — nested
  ordered data does not survive flat form fields — and the JSON is untrusted input like any other.
- **Zod strips unknown keys, so extra menu depth is dropped, not rejected.** A third level costs the
  operator that level and nothing else; an invalid `href` is different, because that is bad data and
  it takes its item with it. Worth knowing before writing a test that asserts rejection.
- **`Label` in `components/ui/field.tsx` requires `htmlFor`** — a deliberate accessibility contract
  from phase 2. Generate the id with `useId` and pass it to the control. For a control that is not a
  single input (the media picker is a button that opens a dialog), use a styled `<p>` instead: a
  `<label>` pointing at it would be a lie.
- **Catalog reads do not swallow a database error the way settings reads do,** so `next build`
  genuinely needs Postgres up — observed when the local server had stopped and the prerender of
  `/th/contact` failed on `publishedCategories`. CI runs `db:migrate` and `db:seed` before `build`,
  so the flow that matters is fine; the asymmetry is worth knowing before assuming a build can run
  dry.
- Testing gotcha, the third time: `page.locator("form").first()` in the admin is the layout's
  **sign-out** form. Scope by content — `page.locator("form").filter({ hasText: "เมนูส่วนหัว" })` —
  or by a field the target form owns.

**Phase 10**

- **The hosted validators are unreachable from this sandbox.** `search.google.com/test/rich-results`
  and `validator.schema.org` are both refused by the egress proxy (organization policy), so §12's
  "Rich Results test passes" was verified against Google's *documented* Product / Article /
  BreadcrumbList / Organization requirements with a local checker, plus a HEAD request on every
  `image` a validator would fetch. Run the hosted test once the site is publicly reachable.
- **`Product` carries an offer only when a price is actually shown.** §10 omits
  `offers.availability` because there is no online purchase; the offer itself is still the only way
  to state a price, so `contact` and `hidden` products get no `offers` node at all. Inventing one
  would be a public claim about a price nobody published — the same reasoning that keeps the price
  line reading สอบถามราคา.
- **The pipeline never upscales, so nothing may advertise a rendition it did not write.** A 420px
  upload has only the 400px derivative; `MediaThumb`'s `srcSet` listed 400/800/1600 unconditionally
  and the browser fetched an 800.avif that 404'd, which Lighthouse counted as a console error and
  dropped Best Practices to 96. Both `MediaThumb` and the OG image helper now take the source width
  and pick from what exists. `PublicMedia` carries `width` for exactly this.
- **hreflang and the sitemap are generated from `locales.is_enabled`, never from the routing table.**
  An alternate for a disabled locale is a 404 handed to a crawler. Verified reciprocal across all
  three locales with three distinct slugs: every page advertises the identical set, every advertised
  URL is one of the pages, and `x-default` points at Thai.
- **Next renders `hrefLang`, not `hreflang`, in the HTML.** It is valid — HTML attribute names are
  case-insensitive — but a case-sensitive grep or regex over the markup finds nothing and looks like
  the tags are missing.
- **`sitemap.xml` is a prerendered route with a 1-hour window,** so toggling a locale does not show
  up there until it revalidates or the app is rebuilt. Whoever builds `/admin/settings/languages`
  should `revalidatePath("/sitemap.xml")` on save.
- **Analytics never load before consent, and the banner never renders when there is nothing to
  consent to.** `ConsentGate` is a server component that returns null unless `settings.seo` carries a
  GA4 or GTM id — a banner that asks permission for nothing trains people to dismiss banners. The
  decision lives in `localStorage`, not a cookie. Verified: zero `googletagmanager` script tags
  before consent, one after, none ever after declining, and the choice survives a reload.
- **librsvg resolves fonts through fontconfig, which cannot read woff2.** The OG image typesets the
  institution's name in Anuphan by pointing `FONTCONFIG_FILE` at TrueType copies in `assets/fonts`
  (outside `public/`, regeneration documented in the README there). Without it the text silently
  falls back to whatever Thai face the machine carries, so the image would differ per developer.
  The script also *measures* the rendered text and scales it to fit — at a fixed size the name ran
  off the canvas and the last glyphs were simply cut.
- **sharp cannot write `.ico`.** The format is a 6-byte header, a 16-byte directory entry per image
  and the PNGs themselves; `buildIco` in the brand script writes it directly rather than adding a
  dependency to a project that pins every version.
- The app icons are **provisional downscales of the seal** (§14 decision 27), which is the treatment
  docs/DESIGN.md forbids, accepted deliberately because shipping none meant a 404 on every page load.
  Re-running `scripts/build-brand-assets.ts` replaces all six once a drawn mark exists.

**Phase 11**

- **Dev-mode upload hangs are not disk problems; they are the webpack watcher wedging under
  Docker Desktop Windows.** `WATCHPACK_POLLING=true` + a bind mount eventually drives the dev
  server to where `/api/health` takes 100–200s and server-action responses die mid-stream
  (`SyntaxError: Unexpected end of JSON input page: '/admin/media'`), which leaves
  `useActionState` stuck in `pending` and the upload button disabled forever. Diagnosed rule of
  thumb: run `docker ps --filter name=cidaplus-dev-web-1` — if `unhealthy` or a host-side
  `http://localhost:3000/api/health` curl exceeds ~30s, `docker restart cidaplus-dev-web-1` fixes
  it (the `media`/`pgdata` volumes survive; the wedge is process state, not data). Validated the
  pipeline through the real UI afterwards: a 1600px JPEG upload wrote the DB row and every
  derivative to `media` correctly. The `media` volume and its permissions were never the cause.
- **`.dockerignore` needs `**/.env`, not `.env`.** A bare pattern is anchored to the context root,
  so it excludes `./.env` and nothing else — and phase 0 established that `next build` writes
  `.next/standalone/.env`. Verified the file is produced by every local build, so an image built
  from a checkout with a `.env` present would have shipped it. The release workflow asserts both
  paths are absent as well, because a `.dockerignore` fix is one careless edit from being undone.
- **`trusted_proxies cloudflare` is not in stock Caddy.** `caddy:2.10-alpine` refuses to start with
  "module not registered: http.ip_sources.cloudflare" — that directive needs the
  caddy-dynamic-clientip plugin and therefore a custom build. Instead `scripts/cloudflare-ips.sh`
  fetches the ranges on the box and writes `caddy/cloudflare-ips.caddy` holding a
  `trusted_proxies static` line, imported from the global `servers` block. The ranges are
  **generated, never committed** (`/caddy/` and `/certs/` are gitignored): a hand-transcribed list is
  a security defect in both directions — too narrow loses visitor IPs, too wide lets anyone spoof
  `CF-Connecting-IP`. The same fetch feeds the ufw rules.
- **The trust boundary is real, and testable without Cloudflare.** With `127.0.0.1/32` in the
  snippet a request carrying `CF-Connecting-IP: 203.0.113.7` logs `client_ip=203.0.113.7`,
  `remote_ip=127.0.0.1`; with it removed the identical request logs `client_ip=127.0.0.1`. That is
  the whole mechanism §11 asks for, verified locally against real Caddy 2.10.2.
- **`admin off` means there is no `caddy reload`.** The admin API is the only way to reload, so
  every config change on the box is a container restart (`docker compose restart caddy`) — noted in
  the RUNBOOK. Cost us a confusing "dial tcp 127.0.0.1:2019: connection refused" mid-test.
- **Caddy's media mount is `/srv/media`, not `/data/media` as everywhere else.** `/data` is Caddy's
  own storage volume; nesting the media volume inside it makes the two mounts order-dependent for
  no benefit. The web and backup containers keep `/data/media`, which is what `MEDIA_DIR` points at.
- **`output: "standalone"` verified negatively as well as positively.** With the two extra
  `COPY` lines for `.next/static` and `public/`, every route serves 200 with CSS, fonts and favicon;
  without them the app runs unhydrated and all three 404. Phase 3 predicted this; the Dockerfile is
  where it is finally load-bearing.
- **The backup writes to `.partial` and renames.** A `pg_dump` killed halfway leaves a file that
  looks like a backup and restores as garbage; an atomic rename means every file in `daily/` is
  either complete or absent. Retention is **counted by file, not by mtime**, so a clock jump or a
  missed night cannot empty the directory. Round-trip verified for real: identical row counts across
  9 tables, 22 tables / 33 indexes / 29 FKs on both sides, media byte-identical.
- **`restore.sh` refuses a populated target unless `FORCE=1`.** The one command in this repo that
  destroys data should not be one typo away from running, and a restore is exactly the moment
  somebody is panicking.
- **`line_clicks` pruning lives in the nightly backup job**, not a separate cron — §6's 30-day
  retention had no enforcement after phase 8. It reads psql's command tag to report the row count,
  so the log says what it deleted rather than that it ran.
- The Origin Certificate is a 15-year cert from the Cloudflare dashboard (§14 decision 30), so
  renewal is a calendar entry rather than a cron job. ACME is off entirely (`auto_https off`):
  HTTP-01 is unreliable behind an orange cloud and DNS-01 would put an API token on the box.
- **Half of §12's phase-11 verification cannot be run here** — there is no VPS, no DNS control and
  no reachable Cloudflare account. The origin-side mechanism is verified locally as above; "cidapt.com
  serves over Full (strict)" is a first-deploy check, and the RUNBOOK carries it as one.
