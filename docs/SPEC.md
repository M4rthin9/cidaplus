# Specification — Thai catalog website + admin CMS

Full build specification. `CLAUDE.md` is the short version loaded every session; this file is the
detail. Sections marked **[DECIDE]** need a human answer before the work they describe starts.

---

## 1. Objective

A production-ready Thai-language catalog website with a complete admin back-office, from empty repo
to a Docker deployment on a single Ubuntu 24.04 VPS.

The site is a **catalog only**. There is no cart, no checkout, no online payment, no customer accounts.
Every product's primary call-to-action sends the visitor to a **LINE Official Account**, where the sale
is completed by a human.

The admin must be able to run the entire site — layout content, page sections, categories, products,
news and events, contact details, theme colors — without touching code or redeploying.

Work in **phases** (Section 12). At the end of each phase, stop, run the verification commands for that
phase, and report results before continuing.

---

## 2. Hard constraints

### Target server
| Resource | Value |
|---|---|
| RAM | 6 GB |
| Disk | 60 GB NVMe SSD |
| CPU | 4 cores |
| IP | 1 IPv4 |
| Transfer | Unlimited |
| OS | Ubuntu Server 24.04 LTS |
| International bandwidth | **Not included / not guaranteed** (confirmed with the hosting provider) |
| Domain | `cidapt.com` |
| Edge | Cloudflare in front of the origin |

Consequences you must design around:

1. **Everything runs in one Docker Compose stack on one host.** No managed database, no external
   object store, no serverless. The whole stack must idle under ~2.5 GB RAM and survive a build
   without OOM. Set explicit `mem_limit` on every service.
2. **Build images in CI or locally, not on the VPS**, or use a swap file. A Next.js production build
   on 6 GB alongside Postgres is tight. Prefer: build → push to GHCR → `docker compose pull` on the VPS.
3. **No international bandwidth guarantee** means overseas visitors may see slow asset loads. So:
   self-host all fonts, no Google Fonts CDN, no external JS, aggressive image optimization, and put
   **Cloudflare (free tier, proxied)** in front of the domain so static assets are cached at the edge.
4. **60 GB disk is the real limit.** Images are the only thing that grows. Enforce upload size caps,
   convert to AVIF/WebP on upload, delete originals over a configurable threshold, and add a disk-usage
   warning in the admin dashboard.

### Non-goals — do not build these
- Shopping cart, checkout, order management, payment gateway, PromptPay QR
- Customer registration or login (admin auth only)
- Stock/inventory tracking
- Multi-tenant support

---

## 3. Technology stack

Confirmed 2026-09-07 (§14 decisions 9 and 11). The only remaining **[DECIDE]** in this table is the
SMTP provider, which is not needed to boot (§11).

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15**, App Router, TypeScript strict | One process serves storefront + admin + API. Cheapest thing to run on a small VPS. |
| Rendering | Server Components + ISR for public pages; client components only for admin | Catalog pages must be static-fast and SEO-indexable. |
| Styling | Tailwind CSS v4 + CSS custom properties for the theme | Theme tokens come from the DB, so colors must be CSS variables, not hard-coded Tailwind classes. |
| Admin UI | shadcn/ui + TanStack Table + dnd-kit (reordering) | |
| Database | **PostgreSQL 16** in Docker | |
| ORM | **Drizzle ORM** + drizzle-kit migrations | Lightweight, SQL-first, easy to review the generated schema. |
| Auth | **Auth.js v5**, credentials provider, **JWT sessions** | Admin-only. Argon2id password hashing. Auth.js refuses database sessions with credentials — see §14 decisions 11 and 13. |
| Media | Local volume + **sharp** derivative pipeline, served through Next `/api/media` or directly by Caddy | Avoids the RAM cost of MinIO. Add MinIO later only if you outgrow the disk. |
| i18n | **next-intl**, DB-backed messages | Thai only in v1 (§14 decision 9). The `*_i18n` tables and `locales.is_enabled` still ship in phase 1, so enabling a locale stays a row insert. Translations come from the DB, not JSON message files, for anything content-shaped. |
| Rich text | **Tiptap** → stored as JSON, rendered server-side | Never store raw HTML from the editor. |
| Validation | **Zod** schemas shared between server actions and forms | |
| Reverse proxy | **Caddy 2** — automatic Let's Encrypt TLS, HTTP/3, compression | One-line TLS. Nginx is fine if you prefer, but then wire up certbot. |
| Email (contact form) | SMTP via nodemailer (Resend / Brevo / Gmail app password) | **[DECIDE]** which provider. |

Runtime: Node 22 LTS, `output: "standalone"` in `next.config.ts`.

---

## 4. Design

The full design system — palette tokens, product card spec, and Thai typography rules — lives in
`docs/DESIGN.md`. Read it before writing any component. Do not invent colors, sizes, or spacing
that are not in that file.

## 5. Site map

### Public

All public routes are locale-prefixed: `/[locale]/...` where locale is `th` | `en` | `zh-Hans`.
`/` 302s to the visitor's best match by `Accept-Language`, defaulting to `th`. The chosen locale is
remembered in a cookie, and the switcher maps to the equivalent slug in the target locale — never
back to the homepage.

```
/[locale]                     Homepage (section-composed, admin-editable)
/[locale]/categories          All categories
/[locale]/category/[slug]     Category listing with filters + pagination
/[locale]/product/[slug]      Product detail → LINE CTA
/[locale]/news                News & events index (filter by type: news | event)
/[locale]/news/[slug]         Article detail
/about                        Static page (CMS-managed)
/how-to-order                 Static page (CMS-managed)
/contact                      Contact info + form + map embed
/gallery                      Optional image gallery
/privacy-policy               CMS-managed
/cookies-policy               CMS-managed
/search?q=                    Site-wide search
/sitemap.xml  /robots.txt     Generated, one URL entry per locale with hreflang alternates
```

### Admin (`/admin`, all routes auth-guarded)
```
/admin                        Dashboard: counts, recent edits, disk usage, LINE click stats
/admin/categories             Tree list, drag-to-reorder, nest one level
/admin/products               Table: search, filter by category, bulk publish/unpublish
/admin/products/[id]          Editor
/admin/posts                  News & events
/admin/posts/[id]             Editor
/admin/pages                  Static pages + homepage section builder
/admin/media                  Media library: upload, tag, alt text, replace, delete, usage check
/admin/menus                  Header/footer menu builder
/admin/settings/general       Site name, logo, favicon, phone, hours, address, social links
/admin/settings/line          LINE OA URL, button labels, message templates
/admin/settings/theme         Colors, fonts, radius, container width — live preview
/admin/messages               Contact form inbox: read, archive, reply-to mailto
/admin/settings/seo           Default meta, OG image, GA4/GTM ID
/admin/settings/languages     Enable/disable locales, set default, translation coverage report
/admin/users                  Admin accounts, roles
/admin/audit                  Change log
```

---

## 6. Data model

Drizzle schema. All tables get `id` (uuid v7), `created_at`, `updated_at`. Soft-delete via
`deleted_at` on `categories`, `products`, `posts`, `media`.

```
locales          code(PK: th|en|zh-Hans), label_native, is_default, is_enabled, sort_order

users            id, email(uniq), password_hash, name, role(owner|editor), last_login_at, is_active

categories       id, hero_media_id→media, icon_media_id→media, parent_id→categories(nullable),
                 sort_order, is_published, og_media_id
category_i18n    category_id, locale, slug, name, description,
                 seo_title, seo_description        PK(category_id, locale) · UNIQUE(locale, slug)

products         id, category_id→categories, price(numeric, nullable),
                 price_display(enum: exact|from|contact|hidden, default exact),
                 sku?, badge?, line_message_override(text, nullable), sort_order,
                 is_featured, is_published, published_at, og_media_id
product_i18n     product_id, locale, slug, name, short_desc, body(jsonb, tiptap),
                 seo_title, seo_description         PK(product_id, locale) · UNIQUE(locale, slug)

product_media    product_id, media_id, sort_order, is_primary   (composite PK)

product_specs    id, product_id, sort_order
product_spec_i18n spec_id, locale, label, value                  (size, material, color…)

posts            id, type(enum: news|event), cover_media_id→media, event_start_at?,
                 event_end_at?, event_location?, is_published, published_at, author_id→users
post_i18n        post_id, locale, slug, title, excerpt, body(jsonb),
                 seo_title, seo_description             PK(post_id, locale) · UNIQUE(locale, slug)

pages            id, key(uniq: home|about|how-to-order|privacy|cookies|…), is_published
page_i18n        page_id, locale, slug, title, sections(jsonb — see below),
                 seo_title, seo_description

menus            id, location(enum: header|footer_a|footer_b)
menu_i18n        menu_id, locale, items(jsonb tree: {label, href, children[], target})

media            id, filename, storage_key, mime, width, height, bytes,
                 tags text[], blurhash, uploaded_by→users
media_i18n       media_id, locale, alt

settings         key, locale(nullable), value(jsonb), updated_by, updated_at
                 PK(key, locale) — locale NULL = applies to all locales

contact_messages id, name, email, phone?, locale, subject?, body, source_path,
                 ip_hash, is_read, is_archived, emailed_at(nullable), created_at

audit_log        id, user_id, entity, entity_id, action, diff(jsonb), created_at

line_clicks      id, product_id?(nullable), locale, path, referrer, ua_hash, created_at
```

### Multilingual model — read this before writing the schema

The site ships **Thai (default), English, and Simplified Chinese**. Translatable text lives in
`*_i18n` side tables keyed by `(entity_id, locale)`, not in `name_th` / `name_en` columns. Adding a
fourth language must be a row insert, never a migration.

Rules:

- **Thai is the fallback.** A missing translation falls back to Thai and the page is still valid —
  it never renders an empty string or the key name. The admin shows a per-entity translation
  completeness indicator so gaps are visible rather than silent.
- **Slugs are per-locale**, unique within a locale, so `/en/product/paper-wreath` and
  `/th/product/พวงหรีดกระดาษ` can coexist. Changing a published slug writes a 301 redirect row.
- **Non-translatable data lives on the parent table only** — price, media, publish state, sort
  order, category assignment. Never duplicate them per locale; that is how prices drift apart.
- **Publish state is global**, not per-locale. A product is published or not; individual
  translations are complete or falling back.
- The admin editor is one form with a locale tab strip, not three separate records. Editing a
  product in English must not require re-entering its price.

### Settings registry
Do **not** use a loose key-value bag. Define a typed registry: one Zod schema per settings key,
with defaults, so `getSetting('theme')` is fully typed and a missing row falls back to the default
instead of crashing. Keys: `general`, `contact`, `line`, `theme`, `seo`, `social`, `analytics`, `i18n`.
Settings whose value is user-visible copy (LINE button label, message template, hero fallback text)
are stored per-locale; structural settings (theme colors, GA4 id) use `locale = NULL`.

Cache settings in memory with a 60-second TTL and bust on write — every page render reads them.

### Homepage section builder
`pages.sections` is an ordered array of discriminated-union blocks. Each block type has its own Zod
schema and its own React renderer. Ship these types:

`hero` · `value_props` · `featured_products` · `category_showcase` · `why_us_grid` ·
`rich_text` · `image_banner` · `latest_posts` · `gallery_strip` · `cta_line` · `faq_accordion`

The admin section builder must let the operator: add a block, choose its type, fill its typed fields,
drag to reorder, toggle visible, duplicate, and delete — with a live preview pane. Unknown block
types render as nothing in production and as a warning in the admin.

---

## 7. Categories to seed

Seed these four top-level categories, published, in this order:

| # | ชื่อ (TH) | slug | note |
|---|---|---|---|
| 1 | พวงหรีดแบ่งปัน | `puangreed-baengpan` | Funeral wreaths — respectful tone, no festive styling |
| 2 | ดอกไม้ประดิษฐ์ | `artificial-flowers` | |
| 3 | ผลิตภัณฑ์ไฟเบอร์กลาส | `fiberglass` | |
| 4 | เย็บปักถักร้อย | `needlework` | |

Seed the Thai row for each. Leave the `en` and `zh-Hans` rows **empty**, not machine-translated —
the fallback path must be exercised from day one, and a wrong English name is worse than a visible
gap. Ask before writing any English or Chinese copy yourself.

Seed 4–6 placeholder products per category with lorem-style Thai text and generated placeholder
images, so every layout can be reviewed with realistic density. Mark all seed content
`is_seed = true` in a metadata column so the admin can purge it in one click from
`/admin/settings/general`.

---

## 8. LINE integration — the core conversion path

Official Account URL: `https://line.me/ti/p/%40355kxfoj` (handle `@355kxfoj`)

Requirements:

1. **Single source of truth.** The URL lives in `settings.line.oa_url`. It must appear nowhere else
   in the codebase. Every button reads it at render time.
2. **Every product page** shows a prominent LINE button — desktop: sticky in the product info column;
   mobile: fixed bottom bar. Default label from `settings.line.button_label`
   (default: `สั่งซื้อ / สอบถามทาง LINE`).
3. **Pre-filled message.** Build the link so the operator knows which product the visitor is asking
   about. Implement a template in `settings.line.message_template`, default:
   `สนใจสอบถามสินค้า: {product_name} ({product_url})`
   Render via a redirect route so the template is server-resolved:
   `/go/line?p={product_slug}` → 302 to the OA URL (with the message when the target link format
   supports it). Per-product override: `products.line_message_override`.
4. **One OA, three locales.** The button label and message template are per-locale settings. The
   `/go/line` route records the visitor's locale so the operator can see which language the enquiry
   came from before replying.
5. **Track the click.** The `/go/line` route writes a `line_clicks` row (product, path, referrer,
   hashed UA — no raw IP, no cookie) before redirecting, and fires a GA4 event if analytics is
   configured. Surface a 30-day click chart on the admin dashboard and a per-product click count
   in the product table. This is the only conversion signal the business has — it matters.
5. **Header, footer, contact page, and every category page** also carry a LINE entry point.
7. `rel="noopener"`, `target="_blank"` on all external LINE links.

---

## 9. Admin CMS behavior — required qualities

The operator is a non-technical Thai staff member. Optimize for that.

- **Thai-first UI.** Every admin label, button, toast, validation message, and empty state is in Thai.
  Latin only for values the operator types. `[DECIDE]` if you also want an EN admin toggle.
- **Never lose work.** Autosave drafts to `localStorage` every 5s while editing and warn on
  navigate-away with unsaved changes. ~~Keep the last 10 revisions per product/post with one-click
  restore~~ — superseded by §14 decision 12: `audit_log` holds the field-level history instead.
- **Images are the hard part.** The media picker must support drag-and-drop upload, multi-select,
  paste-from-clipboard, crop to the required aspect ratio (3:4 for products, 16:9 for post covers)
  before saving, and enforce `alt_th` before publish. Auto-generate AVIF + WebP + JPEG fallback at
  400/800/1600px on upload with sharp, store a blurhash for the placeholder.
- **Slug safety.** Auto-generate slugs from Thai titles via transliteration, editable, uniqueness
  checked live. Changing a published slug creates a 301 redirect row automatically.
- **Publish states:** draft / scheduled / published, with `published_at`. Public queries filter on
  `is_published AND published_at <= now()`.
- **Deletes are soft** and show a "used in N places" warning for media and categories. A category
  with products cannot be deleted until products are moved or unpublished.
- **Bulk actions** on the product table: publish, unpublish, change category, reorder.
- **Every mutation writes an audit_log row** with a field-level diff.
- **Validation errors appear inline**, in Thai, next to the field — never as a bare toast.
- **The contact form persists to the database first, then tries to email.** SMTP is not configured
  yet. Write the `contact_messages` row, then attempt the notification; if SMTP is unset or the send
  fails, the row still exists, the visitor still sees a success state, and the admin inbox at
  `/admin/messages` shows it with `emailed_at = null`. A contact form that silently drops enquiries
  because an env var is missing is the worst possible failure on a site whose entire purpose is
  enquiries. Show an unread count in the admin nav.
- **Translation UX:** one editor with a locale tab strip. The tab shows a dot when that locale is
  incomplete. A "copy from Thai" button pre-fills a locale for editing — it never auto-translates.
- **Missing photo report** on the dashboard: products with no image, or only a placeholder. Real
  photography is arriving later, so make the gap visible instead of letting placeholders ship.

---

## 10. Public site quality bar

- Lighthouse mobile ≥ 95 on Performance, Accessibility, Best Practices, SEO for `/`,
  `/category/[slug]`, `/product/[slug]`.
- LCP < 2.0s on a simulated 4G Thai connection. Hero image preloaded, correctly sized, AVIF first.
- Zero layout shift: every image has explicit width/height or aspect-ratio.
- Full keyboard navigation; visible focus rings; nav dropdowns operable without a mouse;
  `aria-current` on active nav items; skip-to-content link.
- Semantic HTML, `lang="th"`, JSON-LD for `Organization`, `BreadcrumbList`, `Product`
  (with `offers.availability` omitted since there is no online purchase), and `Article` for posts.
- `sitemap.xml` and `robots.txt` generated from published content, with `hreflang` alternates and an
  `x-default` pointing at the Thai version. Every page carries reciprocal `<link rel="alternate">`
  tags — a one-way hreflang is ignored by Google.
- `lang` and `dir` attributes set per locale; Chinese uses a system CJK stack, not Anuphan.
- OG image per product/post, falling back to the site default.
- Cookie consent banner (PDPA-aware): analytics scripts load only after consent.
- PDPA note on the contact form describing what is collected and why.
- Custom 404 and 500 pages in Thai with a LINE CTA.

---

## 11. Deployment architecture

### `docker-compose.yml` (production)
```
caddy      : reverse proxy, automatic TLS, gzip/zstd, serves /media directly
             ports 80,443 · mem_limit 128m
web        : Next.js standalone, node 22-alpine · mem_limit 1024m
db         : postgres:16-alpine · mem_limit 1536m
             shared_buffers=768MB, effective_cache_size=2GB, max_connections=50
backup     : alpine + cron → nightly pg_dump + media tarball, 7 daily / 4 weekly retention
```
Named volumes: `pgdata`, `media`, `caddy_data`, `caddy_config`.
Health checks on `web` and `db`; `restart: unless-stopped` everywhere.

### `docker-compose.dev.yml` (localhost)
Same services minus caddy and backup, with `web` running `next dev` and the source bind-mounted,
Postgres exposed on `5432`, and a mailpit container for contact-form testing.
`docker compose -f docker-compose.dev.yml up` must be the **only** command needed to get a working
local site at `http://localhost:3000` with seeded data.

### Server preparation script (`scripts/provision.sh`)
Idempotent, for a fresh Ubuntu 24.04 box:
- create a non-root deploy user, SSH key only, disable password + root login
- UFW: allow 22/80/443, deny the rest; fail2ban on sshd
- install Docker Engine + compose plugin
- **create a 4 GB swapfile** (`vm.swappiness=10`) — non-negotiable on 6 GB with Postgres
- unattended-upgrades for security patches
- logrotate for Docker JSON logs, `max-size=10m max-file=3`
- a `docker system prune -af --filter "until=168h"` weekly cron (60 GB disk)

### Deploy flow
`scripts/deploy.sh`: pull image → `drizzle-kit migrate` → `docker compose up -d --no-deps web` →
health check → roll back to the previous image tag on failure.

### Cloudflare (`cidapt.com`)

The origin is one IP with no international bandwidth guarantee, so the edge is doing real work here,
not just DNS.

- **SSL/TLS mode: Full (strict).** Flexible mode would leave the origin hop unencrypted and cause
  redirect loops with Caddy.
- **Certificates:** Caddy's HTTP-01 challenge is unreliable behind an orange-clouded proxy. Use
  either a **Cloudflare Origin Certificate** (15-year, pinned to Cloudflare) installed in Caddy, or
  Caddy's **DNS-01 challenge with a scoped Cloudflare API token** (`Zone:DNS:Edit` on this zone
  only). Pick one and document it in the runbook — do not leave both half-configured.
- **Restore visitor IP** in Caddy via `trusted_proxies cloudflare` so logs and rate limits see the
  real client, not a Cloudflare edge IP. Without this, one abusive visitor rate-limits everybody.
- **Cache rules:** cache `/_next/static/*`, `/media/*`, and fonts aggressively (1 year, immutable).
  **Bypass cache** on `/admin/*`, `/api/*`, and `/go/line*` — a cached LINE redirect would poison the
  click tracking and a cached admin page would leak one operator's view to another.
- **Disable Rocket Loader, Auto Minify, and Email Obfuscation on `/admin/*`.** They rewrite markup
  and break React hydration.
- Turn on Brotli, HTTP/3, and Always Use HTTPS. Leave Bot Fight Mode **off** — it blocks
  legitimate crawlers and breaks LINE's link preview fetcher.
- Firewall: allow only Cloudflare IP ranges to reach ports 80/443 on the origin, plus your own IP for
  emergencies. Otherwise the origin IP is directly reachable and the edge is decorative.

### Env
`.env.example` committed, `.env` gitignored. Required:
`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `MEDIA_DIR`, `SMTP_*`, `NEXT_PUBLIC_SITE_URL`,
`LINE_OA_URL` (bootstrap value only — the DB setting wins once set), `CLOUDFLARE_API_TOKEN` (only if
using the DNS-01 challenge).

SMTP is **not yet provisioned** — see §9 for how the contact form behaves without it. The app must
boot and the form must work with `SMTP_*` unset.
Fail fast at boot with a Zod-validated env module.

### Operations
Write `docs/RUNBOOK.md` in **Thai and English** covering: how to deploy, how to restore a backup
(with the actual restore command, tested), how to add an admin user, how to rotate the LINE URL,
what to do when disk hits 80%, and how to read logs.

---

## 12. Build order — stop and report after each phase

| Phase | Deliverable | Verification |
|---|---|---|
| 0 | Repo scaffold, TS strict, ESLint/Prettier, dev compose, env validation | `docker compose -f docker-compose.dev.yml up` serves a page |
| 1 | Drizzle schema **with `*_i18n` tables** + migrations + seed (4 categories, sample products/posts, Thai only) | `pnpm db:seed` runs clean twice in a row; an English page request falls back to Thai |
| 2 | Auth, admin shell, users CRUD, audit log | Can log in, wrong password locks out after 5 tries |
| 3 | Media library + sharp pipeline + picker component | Upload a 5 MB JPEG → AVIF/WebP derivatives + blurhash exist |
| 4 | Categories + products admin CRUD, reorder, bulk actions | Full lifecycle on a product without a page refresh bug |
| 5 | Posts (news/events) admin CRUD with Tiptap | Full lifecycle on a post; a hostile body submitted through the real form is stored sanitised |
| 6 | Settings registry: general, contact, line, theme, seo | Changing the accent color updates the public site with no rebuild |
| 7 | Public storefront + `next-intl` locale routing + language switcher + contact form → inbox | Lighthouse targets met; switching locale on a product page lands on the same product; submitting the contact form with SMTP unset still creates a row |
| 8 | LINE CTA everywhere + `/go/line` redirect + click tracking + dashboard chart | Click on a product CTA increments the counter and lands on the OA |
| 9 | Menu builder + homepage section builder with live preview | Operator can reorder the homepage and see it live |
| 10 | SEO, JSON-LD, per-locale sitemap + hreflang, OG images, cookie consent, PDPA notice | Rich Results test passes for a product page; hreflang tags are reciprocal across all three locales |
| 11 | Prod compose, Caddy + Cloudflare, provision + deploy + backup scripts, RUNBOOK | Backup restored into a clean container successfully; `cidapt.com` serves over Full (strict) TLS and origin logs show real visitor IPs |

---

## 13. Code standards

- TypeScript `strict: true`, no `any`, no non-null assertions except with a comment justifying it.
- Server Actions for mutations, `revalidateTag` for cache invalidation — no ad-hoc `fetch` to own API.
- One Zod schema per entity, imported by both the form and the server action. Never validate twice
  with two different shapes.
- No secret, no LINE URL, no phone number, no email hard-coded in a component.
- Rate-limit the login route and the contact form (in-memory token bucket is fine at this scale).
- CSRF protection on all mutations; `Content-Security-Policy` header with no `unsafe-inline` in prod.
- Image uploads: validate magic bytes, not just the extension. Cap at 10 MB. Strip EXIF.
- Sanitize Tiptap JSON on the server before storing; render through a whitelist, never
  `dangerouslySetInnerHTML` on user input.
- Tests: Vitest for the settings registry, slug generation, LINE link builder, and Zod schemas.
  Playwright for one end-to-end path — log in → create product → publish → see it on the storefront →
  click the LINE CTA.
- Conventional commits. Every phase ends on a green build.

---

## 14. Decisions

Answered — treat these as settled, not as open questions.

| # | Decision |
|---|---|
| 1 | Domain is **`cidapt.com`**, with **Cloudflare in front**. See §11 for the required Cloudflare configuration. |
| 2 | Logo: `https://dashboard.cida.dpdns.org/cida-logo.png`. **Download it into the repo and the media library — never hotlink it from another host.** Derivative requirements in `docs/DESIGN.md`. |
| 3 | **No per-product donation or impact figures.** Drop the impact fields, the impact pill on the product card, and the running-total band. Green remains the community/LINE accent (see `docs/DESIGN.md`). |
| 4 | **Multilingual is required**, not deferred. Thai default, English, Simplified Chinese, via `*_i18n` tables from phase 1. See §6. |
| 5 | SMTP provider **to be supplied later**. Build the contact form so it works without it (§9). |
| 6 | Real product photography **arriving later**. Use placeholders, surface a missing-photo report, and don't build layouts that only look right with perfect images. |
| 7 | "No Inter Bandwidth" confirmed as the hosting provider's term for international transit not being guaranteed. Cloudflare absorbs this for cached assets; keep origin payloads small anyway. |
| 8 | **The site belongs to ทัณฑสถานบำบัดพิเศษกลาง** (กรมราชทัณฑ์, กระทรวงยุติธรรม) and use of the seal is authorized. It is an official institutional site, not a shop: the affiliation is visible above the fold, and the care-nation.com reference contributes section rhythm only. Settled 2026-09-07. |
| 9 | **v1 ships Thai only.** The `*_i18n` tables, the `locales` table and `is_enabled` are still built in phase 1 exactly as §6 specifies — adding a language stays a row insert — but no English or Chinese public routes ship until a translator is assigned. This retires §14.4 and defers §14.5. Settled 2026-09-07. |
| 10 | **The palette is rebuilt around the seal.** Crimson `#8C1330`, LINE green `#0B7A3F`, warm neutrals; no blue anywhere. The previous navy `#10294B` / green `#17A66B` were chosen before the logo existed and clash with it, and `#17A66B` fails WCAG AA (3.13:1) as a button fill with a white label. See `docs/DESIGN.md`. Settled 2026-09-07. |
| 11 | **Auth is Auth.js v5**, credentials provider, sessions in Postgres, Argon2id hashing. This closes the last `[DECIDE]` that blocked phase 0. Settled 2026-09-07. |
| 12 | **No `revisions` table.** §9's "last 10 revisions with one-click restore" is dropped: `audit_log` already stores a field-level diff on every mutation, and localStorage autosave covers in-progress loss. Restore-from-audit can be added later without a schema change. Settled 2026-09-07. |
| 13 | **Sessions are JWT, not Postgres rows.** `@auth/core` asserts "Signing in with credentials only supported if JWT strategy is enabled", so §3's original wording was not buildable. Revocation — the capability database sessions were wanted for — is recovered by `users.session_version`: deactivating a user, changing a password, or changing a role bumps it, and `requireAdmin()` rejects any token minted before the bump. Settled 2026-09-07. |
| 14 | **Login lockout is persisted on `users`,** not an in-memory counter. §13's "in-memory token bucket is fine" still governs *rate limiting* (one source, short burst); the per-account lockout is a different mechanism and lives in `failed_login_attempts` / `locked_until`, because an in-memory counter would reset on every deploy. 5 attempts, 15-minute lock. Settled 2026-09-07. |
| 15 | **Media framing is non-destructive.** §9's "crop to the required aspect ratio before saving" cannot hold: `media` is a shared library and `product_media` is a join table, so one image can be a product photo and a post cover at once and a stored crop would lock it to one aspect forever. One derivative set is kept at the natural aspect; `media.focal_x` / `focal_y`, seeded by sharp's attention detector and editable in the admin, drive `object-fit: cover` at the consumer. Settled 2026-09-08. |
| 16 | **Media is served at `/media/*`, not `/api/media/*`.** §3 offered either, but §11 tells Cloudflare to cache `/media/*` and to BYPASS cache on `/api/*` — serving from an `/api` path would have made every image uncacheable at the edge, on a host with no guaranteed international bandwidth. Caddy can take the same path over in phase 11 with no URL change. Settled 2026-09-08. |
| 17 | **Slugs are Thai UTF-8, generated from the title.** §9 asked for machine transliteration, but reaching the quality of §7's hand-written `puangreed-baengpan` needs dictionary word-segmentation — Thai has no spaces between words — and a character-level mapping would bake an awkward permanent URL. §6's own example is already a Thai slug, Google indexes UTF-8 paths, and slugs are per-locale so enabling English later gives it clean Latin independently. Editable, uniqueness-checked, 301 written on change. Settled 2026-09-08. |
| 18 | **Rich-text bodies allow headings (2–3), bold, italic, lists, blockquote, rule, links and images chosen from the media library.** Images carry a `mediaId`, never a URL, so an external image is not expressible in the document model — "no hotlinked assets" becomes structural rather than a review item. The server rebuilds every document against the whitelist before storage and drops any image whose media row does not exist. Settled 2026-09-08. |

### Still open — ask before the phase that needs them

1. ~~**Logo master dimensions, alpha channel, and edge quality.**~~ **Answered 2026-09-07.**
   The file is committed at `public/brand/cida-logo.png`: **5906 × 5906px**, RGBA with real
   transparency, 37px (0.6%) of trimmable margin, clean anti-aliased edges, 7.5 MB. Measured
   colours corrected the palette — see `docs/DESIGN.md` → "Verified". An authoritative **SVG master
   is still worth requesting** for print, signage and the simplified favicon mark, but nothing is
   blocked on it.

2. **Who writes English and Chinese, if either is ever switched on.** Deferred with decision 9, not
   resolved. Nobody should machine-translate product names without a human sign-off; decide who that
   is before `locales.is_enabled` is flipped on anything.

3. **SMTP provider, when chosen.** Phase 7. The contact form must work without it (§9).

4. **EN admin toggle — §9 `[DECIDE]`.** All admin copy is Thai. Whether an English admin toggle is
   also wanted affects phase 2. Assume no unless told otherwise.

### Raised by the seal, not yet in any phase

- **Does the site need to state its affiliation formally** — a link to the กรมราชทัณฑ์ parent site, a
  ministry footer credit, or a specific official disclaimer? Official Thai institutional sites
  normally carry one, and it is cheaper to design the footer around it now than to retrofit.
- **Is a LINE Official Account acceptable as the sole enquiry channel for a public-sector body,** or
  does a government telephone number and postal address need equal prominence? §8 currently makes
  LINE the only CTA.
- **WCAG 2.0 AA is effectively mandatory** for Thai public-sector sites, which turns §10's Lighthouse
  Accessibility ≥ 95 from a target into a compliance floor. The palette in `docs/DESIGN.md` now
  clears it; keep every future token above 4.5:1 for normal text.
