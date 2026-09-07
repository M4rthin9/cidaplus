# Build Prompt — Thai Catalog Website + Admin CMS (Self-hosted on VPS, Docker)

> Paste this whole file as the opening prompt to your coding agent (Claude Code, Cursor, etc.).
> Everything below the line is the instruction set. Sections marked **[DECIDE]** are places
> where you should confirm a choice before the agent starts.

---

## 1. Role and objective

You are a senior full-stack engineer. Build a **production-ready Thai-language catalog website with a
complete admin back-office**, from empty repo to a Docker deployment on a single Ubuntu 24.04 VPS.

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
| International bandwidth | **Not included / not guaranteed** |

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

**[DECIDE]** — this is the recommended stack. Confirm or substitute before starting.

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15**, App Router, TypeScript strict | One process serves storefront + admin + API. Cheapest thing to run on a small VPS. |
| Rendering | Server Components + ISR for public pages; client components only for admin | Catalog pages must be static-fast and SEO-indexable. |
| Styling | Tailwind CSS v4 + CSS custom properties for the theme | Theme tokens come from the DB, so colors must be CSS variables, not hard-coded Tailwind classes. |
| Admin UI | shadcn/ui + TanStack Table + dnd-kit (reordering) | |
| Database | **PostgreSQL 16** in Docker | |
| ORM | **Drizzle ORM** + drizzle-kit migrations | Lightweight, SQL-first, easy to review the generated schema. |
| Auth | **Auth.js v5** (credentials provider) or **better-auth**, sessions in Postgres | Admin-only. Argon2id password hashing. |
| Media | Local volume + **sharp** derivative pipeline, served through Next `/api/media` or directly by Caddy | Avoids the RAM cost of MinIO. Add MinIO later only if you outgrow the disk. |
| Rich text | **Tiptap** → stored as JSON, rendered server-side | Never store raw HTML from the editor. |
| Validation | **Zod** schemas shared between server actions and forms | |
| Reverse proxy | **Caddy 2** — automatic Let's Encrypt TLS, HTTP/3, compression | One-line TLS. Nginx is fine if you prefer, but then wire up certbot. |
| Email (contact form) | SMTP via nodemailer (Resend / Brevo / Gmail app password) | **[DECIDE]** which provider. |

Runtime: Node 22 LTS, `output: "standalone"` in `next.config.ts`.

---

## 4. Design reference

Two references define the **layout and section rhythm only** — not the content, not the brand, not the
copy, and not the color palette:

- `https://care-nation.com/`
- `https://gitreverse.com/designs/care-nation-com`

What to take from the reference homepage, in order:

1. Thin utility bar — phone number + LINE handle, right-aligned
2. Sticky header — logo left, multi-level dropdown nav center/right, search icon, LINE button as the
   only CTA (the reference has a cart icon; **replace it with a LINE button**)
3. Full-bleed hero with headline, 3–4 checkmark value props, and a primary CTA
4. Highlight strip — 3 icon + short-label trust badges
5. Featured products grid — portrait (3:4) image cards, product name, **price**, and a **donation
   impact line** in the green accent (see the product card spec in Section 4.2)
6. Category showcase blocks — one band per main category, alternating image/text alignment
7. "Why us" grid — icon + heading + paragraph, 5–6 cells
8. News / activities row — 3 latest posts as image cards with title and excerpt
9. Footer — about paragraph, important links column, social icons, phone + business hours,
   copyright + privacy/cookie links

Mobile: hamburger drawer, single-column stacking, sticky bottom "สั่งซื้อทาง LINE" bar.

### 4.1 Visual direction

Professional and warm. White background throughout, deep navy for headings, blue for links and
primary actions, and a fresh green reserved for community and impact messages. This catalog includes
funeral wreaths, so the tone stays respectful — generous whitespace, no festive styling, no urgency
banners, no discount badges. Warmth comes from the photography and the impact messaging, not from
decoration.

**Color is semantic. Each color has exactly one job:**

| Token | Hex | Used for | Never used for |
|---|---|---|---|
| `--color-bg` | `#FFFFFF` | Page background | |
| `--color-surface` | `#F6F9FC` | Section bands, cards, input fields | |
| `--color-surface-alt` | `#EDF2F8` | Image placeholders, hover states | |
| `--color-heading` | `#10294B` | All headings, product names, prices | Body paragraphs |
| `--color-text` | `#4A5A6E` | Body text | Headings |
| `--color-text-muted` | `#7C8BA0` | Captions, timestamps, meta | Anything load-bearing |
| `--color-link` | `#1A5FD0` | Links, primary buttons, "ดูทั้งหมด" | Impact messaging |
| `--color-link-hover` | `#14499E` | Link/button hover | |
| `--color-accent` | `#17A66B` | LINE button, impact figures, checkmarks | Generic decoration |
| `--color-accent-tint` | `#E8F7F0` | Impact pill and impact band background | Large areas |
| `--color-accent-ink` | `#0B6B45` | Text on `--color-accent-tint` | Text on white |
| `--color-border` | `#E4EAF1` | Hairlines, card borders | |

Rules: green appears **only** on impact/community/LINE elements — if green shows up on a generic
button, it has lost its meaning. Blue is for navigation and action. Never place body text directly on
`--color-accent`; use `--color-accent-tint` with `--color-accent-ink`. All values live in
`settings.theme` and render as CSS custom properties on `<html>`, so the admin can retune them
without a rebuild. Every component reads the variables — no hard-coded hex anywhere in a component.

Radius: `8px` cards and images, `6px` buttons and pills. Borders `1px solid var(--color-border)`.
No drop shadows on cards; separation comes from the border and the surface tint. Container max-width
`1200px`, gutters `24px` desktop / `16px` mobile.

### 4.2 Product card — the most important component on the site

Portrait 3:4 image on `--color-surface-alt`, then, stacked with `8px` gaps:

1. Product name — 16px / 500 / `--color-heading`, clamped to 2 lines
2. Price — 18px / 600 / `--color-heading`, Thai baht formatted `2,500 บาท`
3. Impact pill — 12px, `--color-accent-tint` background, `--color-accent-ink` text, `6px` radius,
   text driven by the product's impact fields, e.g. `คืนสู่ชุมชน 1,000 บาท (40%)`

Grid: 4 columns desktop, 3 at 1024px, 2 at 640px, `24px` gap. Hover raises the border to
`--color-heading` at 15% and scales the image `1.02` — nothing more. The whole card is one link to
the product page; the LINE button lives on the detail page, not on the card, so the card stays calm.

If a product has no impact data, the pill is omitted entirely — never render an empty or
placeholder pill.

### 4.3 Typography
Font pair: **Anuphan** as the primary face (Thai + Latin, modern humanist sans, self-hosted woff2),
with **Inter** as the Latin fallback and system sans below that. Anuphan reads as friendly and
contemporary rather than institutional, which is the tone this site needs. Subset and preload only
the weights used: 400, 500, 600. `font-display: swap`. No Google Fonts CDN — self-host.

| Role | Size / weight / leading | Color |
|---|---|---|
| H1 hero | 40px / 600 / 1.45 (28px mobile) | `--color-heading` |
| H2 section | 28px / 600 / 1.5 | `--color-heading` |
| H3 card, subsection | 20px / 500 / 1.55 | `--color-heading` |
| Body | 16px / 400 / **1.8** | `--color-text` |
| Small, meta | 13px / 400 / 1.7 | `--color-text-muted` |
| Price | 18px / 600 / 1.4 | `--color-heading` |
| Pill, badge | 12px / 500 / 1.5 | `--color-accent-ink` |

Thai-specific rules — these are correctness, not preference:

- `line-height: 1.8` for Thai body and never below `1.45` for headings. Thai diacritics stack above
  and below the baseline and get clipped at normal Latin leading.
- `letter-spacing: 0` on all Thai text. Never apply tracking to Thai — it breaks the visual word
  grouping that Thai relies on, since there are no spaces between words.
- Wrap inline Latin and numerals inside Thai headings in a `.lat` span so size and baseline can be
  tuned independently of the Thai glyphs.
- `word-break: normal` with `overflow-wrap: break-word`. Do not rely on the browser's Thai
  line-breaking in narrow columns — test every layout at 360px width.
- Buttons and pills need extra vertical padding versus a Latin equivalent so tall diacritics don't
  touch the border. Minimum `10px` top/bottom on a 12–14px label.

---

## 5. Site map

### Public
```
/                             Homepage (section-composed, admin-editable)
/categories                   All categories
/category/[slug]              Category listing with filters + pagination
/product/[slug]               Product detail → LINE CTA
/news                         News & events index (filter by type: news | event)
/news/[slug]                  Article detail
/about                        Static page (CMS-managed)
/how-to-order                 Static page (CMS-managed)
/contact                      Contact info + form + map embed
/gallery                      Optional image gallery
/privacy-policy               CMS-managed
/cookies-policy               CMS-managed
/search?q=                    Site-wide search
/sitemap.xml  /robots.txt     Generated
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
/admin/settings/seo           Default meta, OG image, GA4/GTM ID
/admin/users                  Admin accounts, roles
/admin/audit                  Change log
```

---

## 6. Data model

Drizzle schema. All tables get `id` (uuid v7), `created_at`, `updated_at`. Soft-delete via
`deleted_at` on `categories`, `products`, `posts`, `media`.

```
users            id, email(uniq), password_hash, name, role(owner|editor), last_login_at, is_active

categories       id, slug(uniq), name_th, name_en?, description_th, description_en?,
                 hero_media_id→media, icon_media_id→media, parent_id→categories(nullable),
                 sort_order, is_published, seo_title, seo_description, og_media_id

products         id, slug(uniq), category_id→categories, name_th, name_en?,
                 short_desc_th, body_th(jsonb, tiptap), price(numeric, nullable),
                 price_display(enum: exact|from|contact|hidden, default exact),
                 impact_amount(numeric, nullable), impact_percent(int, nullable),
                 impact_label_th(text, nullable), sku?, badge?,
                 line_message_override(text, nullable), sort_order, is_featured,
                 is_published, published_at, seo_title, seo_description, og_media_id

product_media    product_id, media_id, sort_order, is_primary   (composite PK)

product_specs    product_id, label_th, value_th, sort_order      (size, material, color…)

posts            id, slug(uniq), type(enum: news|event), title_th, excerpt_th,
                 body_th(jsonb), cover_media_id→media, event_start_at?, event_end_at?,
                 event_location?, is_published, published_at, author_id→users,
                 seo_title, seo_description

pages            id, slug(uniq), title_th, sections(jsonb — see below), is_published,
                 seo_title, seo_description

menus            id, location(enum: header|footer_a|footer_b), items(jsonb tree:
                 {label_th, href, children[], target})

media            id, filename, storage_key, mime, width, height, bytes, alt_th,
                 tags text[], blurhash, uploaded_by→users

settings         key(PK), value(jsonb), updated_by, updated_at   ← typed registry, see below

audit_log        id, user_id, entity, entity_id, action, diff(jsonb), created_at

line_clicks      id, product_id?(nullable), path, referrer, ua_hash, created_at
```

### Settings registry
Do **not** use a loose key-value bag. Define a typed registry: one Zod schema per settings key,
with defaults, so `getSetting('theme')` is fully typed and a missing row falls back to the default
instead of crashing. Keys: `general`, `contact`, `line`, `theme`, `seo`, `social`, `analytics`.

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
4. **Track the click.** The `/go/line` route writes a `line_clicks` row (product, path, referrer,
   hashed UA — no raw IP, no cookie) before redirecting, and fires a GA4 event if analytics is
   configured. Surface a 30-day click chart on the admin dashboard and a per-product click count
   in the product table. This is the only conversion signal the business has — it matters.
5. **Header, footer, contact page, and every category page** also carry a LINE entry point.
6. `rel="noopener"`, `target="_blank"` on all external LINE links.

---

## 9. Admin CMS behavior — required qualities

The operator is a non-technical Thai staff member. Optimize for that.

- **Thai-first UI.** Every admin label, button, toast, validation message, and empty state is in Thai.
  Latin only for values the operator types. `[DECIDE]` if you also want an EN admin toggle.
- **Never lose work.** Autosave drafts to `localStorage` every 5s while editing, warn on navigate-away
  with unsaved changes, and keep the last 10 revisions per product/post with one-click restore.
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
- `sitemap.xml` and `robots.txt` generated from published content.
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

### Env
`.env.example` committed, `.env` gitignored. Required:
`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `MEDIA_DIR`, `SMTP_*`, `NEXT_PUBLIC_SITE_URL`,
`LINE_OA_URL` (bootstrap value only — the DB setting wins once set).
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
| 1 | Drizzle schema + migrations + seed script (4 categories, sample products/posts) | `pnpm db:seed` runs clean twice in a row |
| 2 | Auth, admin shell, users CRUD, audit log | Can log in, wrong password locks out after 5 tries |
| 3 | Media library + sharp pipeline + picker component | Upload a 5 MB JPEG → AVIF/WebP derivatives + blurhash exist |
| 4 | Categories + products admin CRUD, reorder, bulk actions | Full lifecycle on a product without a page refresh bug |
| 5 | Posts (news/events) admin CRUD with Tiptap | |
| 6 | Settings registry: general, contact, line, theme, seo | Changing the accent color updates the public site with no rebuild |
| 7 | Public storefront: home, category, product, news, static pages, search, 404 | Lighthouse targets met |
| 8 | LINE CTA everywhere + `/go/line` redirect + click tracking + dashboard chart | Click on a product CTA increments the counter and lands on the OA |
| 9 | Menu builder + homepage section builder with live preview | Operator can reorder the homepage and see it live |
| 10 | SEO, JSON-LD, sitemap, OG images, cookie consent, PDPA notice | Rich Results test passes for a product page |
| 11 | Prod compose, Caddy, provision + deploy + backup scripts, RUNBOOK | Backup restored into a clean container successfully |

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

## 14. Open questions — ask me before you start

1. Domain name and whether Cloudflare will be in front.
2. Brand assets: logo file, accent color, any existing style guide. If none, propose three palettes.
3. Impact data source: is the community return amount a **fixed baht figure per product**, a
   **percentage of price**, or both? The schema supports both, but the admin form should default to
   whichever you actually maintain — and `impact_label_th` needs a house wording
   (`คืนสู่ชุมชน` vs `แบ่งปันสู่ชุมชน` vs something else). Whatever you pick must be verifiable,
   since it is a public claim about money.
4. Does the site need English or Chinese versions later? If yes, keep every `*_th` column paired with
   `*_en` from day one and add a locale switcher scaffold now — retrofitting i18n is expensive.
5. SMTP provider for the contact form.
6. Real product photography timeline — placeholder images will cap the visual quality of the review.
7. Confirm "No Inter Bandwidth" means international transit is not guaranteed (my assumption), not
   that transfer is metered.
