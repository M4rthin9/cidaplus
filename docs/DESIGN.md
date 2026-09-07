# Design system — Thai catalog site

Authoritative. Every color, size, and spacing value used in a component must come from this file.
If something you need is missing, ask before inventing it.

## Layout reference

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
5. Featured products grid — portrait (3:4) image cards, product name and **price** (see the product
   card spec below)
6. Category showcase blocks — one band per main category, alternating image/text alignment
7. "Why us" grid — icon + heading + paragraph, 5–6 cells
8. News / activities row — 3 latest posts as image cards with title and excerpt
9. Footer — about paragraph, important links column, social icons, phone + business hours,
   copyright + privacy/cookie links

Mobile: hamburger drawer, single-column stacking, sticky bottom "สั่งซื้อทาง LINE" bar.

## Visual direction

Professional and warm. White background throughout, deep navy for headings, blue for links and
primary actions, and a fresh green reserved for community messaging and the LINE handoff. This catalog includes
funeral wreaths, so the tone stays respectful — generous whitespace, no festive styling, no urgency
banners, no discount badges. Warmth comes from the photography and the community story, not from
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
| `--color-link` | `#1A5FD0` | Links, primary buttons, "ดูทั้งหมด" | Community messaging |
| `--color-link-hover` | `#14499E` | Link/button hover | |
| `--color-accent` | `#17A66B` | LINE button, community band, checkmarks | Generic decoration |
| `--color-accent-tint` | `#E8F7F0` | Community band background, LINE-related pills | Large areas |
| `--color-accent-ink` | `#0B6B45` | Text on `--color-accent-tint` | Text on white |
| `--color-border` | `#E4EAF1` | Hairlines, card borders | |

Rules: green appears **only** on community-story and LINE elements — if green shows up on a generic
button, it has lost its meaning. Blue is for navigation and action. Never place body text directly on
`--color-accent`; use `--color-accent-tint` with `--color-accent-ink`. All values live in
`settings.theme` and render as CSS custom properties on `<html>`, so the admin can retune them
without a rebuild. Every component reads the variables — no hard-coded hex anywhere in a component.

Radius: `8px` cards and images, `6px` buttons and pills. Borders `1px solid var(--color-border)`.
No drop shadows on cards; separation comes from the border and the surface tint. Container max-width
`1200px`, gutters `24px` desktop / `16px` mobile.

## Product card — the most important component on the site

Portrait 3:4 image on `--color-surface-alt`, then, stacked with `8px` gaps:

1. Product name — 16px / 500 / `--color-heading`, clamped to 2 lines
2. Price — 18px / 600 / `--color-heading`, Thai baht formatted `2,500 บาท`
3. Nothing else. No badge, no category label, no "add to enquiry" control.

Grid: 4 columns desktop, 3 at 1024px, 2 at 640px, `24px` gap. Hover raises the border to
`--color-heading` at 15% and scales the image `1.02` — nothing more. The whole card is one link to
the product page; the LINE button lives on the detail page, not on the card, so the card stays calm.

There are **no per-product donation or impact figures** on this site. If community messaging is
needed, it lives in an editable band section on the homepage or category page — never as a computed
number attached to a product, since that would be a public claim about money that nobody is
maintaining.

When `price_display` is `contact`, the price line renders `สอบถามราคา` in `--color-text`, not an
empty gap. When a product has no photograph yet, the image slot renders the neutral
`--color-surface-alt` block with a centered mark — never a stretched logo and never a broken image
icon. Real photography is arriving later, so this state will be visible for a while and needs to
look deliberate.

## Brand assets

Source of truth: `https://dashboard.cida.dpdns.org/cida-logo.png`.

Download it into `public/brand/` and the media library on first use. **Do not hotlink it in
production** — that host sits outside this deployment and outside Cloudflare's cache, so a hotlink
makes every page load depend on a server nobody is monitoring for this site.

Verify before phase 7, and report the answers rather than working around them:

- **Width ≥ 1024px?** If yes it covers every derivative below. If it is closer to 400px, the header
  lockup and the OG image will both look soft, and a vector master is needed.
- **Transparent background?** The logo has to sit on white (header) and on a dark surface (footer).
  If a single file doesn't work on both, produce a light and a dark variant, not a white box.
- **Trimmed?** Strip any baked-in padding so the header can control its own spacing.
- **Clean edges?** If it was exported from a screenshot or a JPEG, the halo will be visible at 2×.

Derivatives to generate from the master (script this, don't hand-export):

| Output | Size | Use |
|---|---|---|
| `logo.svg` or `logo@2x.png` | ≥600px wide | Header lockup, rendered at ≤120px |
| `favicon.ico` | 16 / 32 / 48 | Browser tab |
| `apple-touch-icon.png` | 180×180 | iOS home screen |
| `icon-192.png`, `icon-512.png` | as named | PWA manifest |
| `icon-maskable-512.png` | 512×512, 20% safe padding | Android adaptive icon |
| `og-default.png` | 1200×630 | Social and LINE link previews |

The LINE link preview matters more than usual here — it is the image people see when the OA link gets
forwarded, which is the site's main distribution path.

An SVG master is still worth requesting even if the PNG is large enough. Print, signage, and any
future hero treatment will need it, and it removes the whole derivative-quality question permanently.

## Typography
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

### Other locales

The site runs in Thai, English, and Simplified Chinese.

- English uses **Inter** at the same scale, with `line-height` dropping to `1.7` for body — Thai's
  `1.8` looks loose set in Latin.
- Simplified Chinese uses a **system CJK stack** (`"PingFang SC", "Noto Sans SC", "Microsoft YaHei",
  sans-serif`), not Anuphan, which has no CJK coverage. Body `line-height: 1.9`, and `letter-spacing:
  0.02em` — the one place tracking is allowed.
- **Every layout must survive text expansion.** English strings run 15–30% longer than Thai; Chinese
  runs shorter but taller. No fixed-width buttons, no single-line assumptions on headings, no
  truncation that hides meaning. Test each locale at 360px.

---

