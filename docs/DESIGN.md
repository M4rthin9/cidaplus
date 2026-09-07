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

Official, professional, warm. This is the public catalog of **ทัณฑสถานบำบัดพิเศษกลาง**
(กรมราชทัณฑ์ กระทรวงยุติธรรม), so institutional credibility comes first: the affiliation is visible
above the fold, not buried in a footer. White background throughout, warm near-black for headings,
the seal's crimson for navigation and links, and a single deep green reserved for the LINE handoff.
This catalog includes funeral wreaths, so the tone stays respectful — generous whitespace, no festive
styling, no urgency banners, no discount badges. Warmth comes from the photography and the vocational
story, not from decoration.

The layout reference in the section above is a **commercial** shop. Take its section rhythm and
nothing else: an official site earns trust by showing who it is, not by looking like a store.

**Color is semantic. Each color has exactly one job.** The palette is derived from the seal —
crimson field, gold artwork, black rings — not chosen independently of it.

| Token | Hex | On white | Used for | Never used for |
|---|---|---|---|---|
| `--color-bg` | `#FFFFFF` | — | Page background | |
| `--color-surface` | `#F8F6F5` | — | Section bands, cards, input fields | |
| `--color-surface-alt` | `#EFEAE8` | — | Image placeholders, hover states | |
| `--color-heading` | `#241C1E` | 16.7:1 | All headings, product names, prices | Body paragraphs. **Never crimson** — too loud at heading scale, and wrong beside wreaths |
| `--color-text` | `#574E50` | 8.0:1 | Body text | Headings |
| `--color-text-muted` | `#6F6467` | 5.7:1 | Captions, timestamps, meta | Anything load-bearing |
| `--color-brand` | `#8C1330` | 9.3:1 | Links, active nav, footer band, section-heading rules | Large fills; any surface carrying body text |
| `--color-brand-hover` | `#6E0E26` | 12.4:1 | Link and nav hover | |
| `--color-brand-tint` | `#FBF1F3` | — | Quiet crimson pills, table header bands | Large areas |
| `--color-accent` | `#0B7A3F` | 5.4:1 white-on-fill | **LINE button fill only** | Anything that is not the LINE handoff |
| `--color-accent-tint` | `#E8F5EC` | — | LINE-related pills, community band background | Large areas |
| `--color-accent-ink` | `#075C2F` | 7.3:1 on tint | Text on `--color-accent-tint` | Text on white |
| `--color-border` | `#E2DAD8` | — | Hairlines, card borders | |
| `--color-seal-gold` | `#F0CA3C` | 1.7:1 — fails | **Inside the seal artwork only** | Text, buttons, icons, any UI surface |

Rules:

- **Crimson is navigation and identity.** It comes out of the seal, so it is the one color allowed to
  echo the mark. Links, active nav, the footer band, the rule under a section heading.
- **Green appears only on the LINE handoff.** If green shows up on a generic button it has lost its
  meaning. Never place body text directly on `--color-accent`; use `--color-accent-tint` with
  `--color-accent-ink`.
- **Gold never leaves the seal.** `#F0CA3C` on white is 1.7:1. It is legible only on the crimson
  field inside the artwork, and there is no UI role for it.
- **Three hues, total.** Crimson, one green, warm neutrals. Do not add a blue: a navy or link-blue
  beside the crimson seal reads as two organizations sharing a header.

**Contrast is a hard gate, not a preference.** Thai government web guidance holds public-sector sites
to WCAG 2.0 AA, and §10 of SPEC.md already gates on Lighthouse Accessibility ≥ 95. Every value above
is chosen to clear 4.5:1 for normal text. Two traps this palette exists to avoid: LINE's own brand
green `#06C755` is **2.3:1** with white and the previously specified `#17A66B` is **3.13:1** — both
fail AA as a button fill with a white label, on the site's primary call to action.

All values live in `settings.theme` and render as CSS custom properties on `<html>`, so the admin can
retune them without a rebuild. Every component reads the variables — no hard-coded hex anywhere in a
component.

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

The mark is the official seal of **ทัณฑสถานบำบัดพิเศษกลาง** — outer ring
`ทัณฑสถานบำบัดพิเศษกลาง`, lower ring `กรมราชทัณฑ์ กระทรวงยุติธรรม`, centre พระยมทรงสิงห์ in flames.
Crimson field, gold artwork, black rings, white ground.

Because it is a เครื่องหมายราชการ, it is reproduced exactly: never recolored, never redrawn, never
placed on a tinted panel, never cropped, and never stretched. If a treatment needs the mark to change,
the treatment is wrong.

Source of truth: `public/brand/cida-logo.png`, committed to this repo and registered in the media
library. **Do not hotlink** `dashboard.cida.dpdns.org` in production — that host sits outside this
deployment and outside Cloudflare's cache, so a hotlink makes every page load depend on a server
nobody is monitoring for this site.

### A seal is not a header logo

This is the constraint that governs every derivative below. The mark carries two concentric rings of
Thai microtext. At the ≤120px header size those rings become grey noise, and at 16px the whole seal
is a maroon dot. Two consequences:

- **The header uses a lockup, not a scaled seal**: the mark at a legible size beside the institution
  name typeset separately in Anuphan. The name is live text, not part of the image.
- **The favicon and the maskable icon need a simplified mark** drawn on purpose — the central figure
  or a crimson/gold monogram — not a downscale of the full seal.

### Still unverified — blocked on the file

The PNG has not been measured. It reached this session as a pasted image, which carries no file, and
the original host is blocked by egress policy. These three answers require the actual bytes and must
not be guessed:

| Check | Why it matters | Status |
|---|---|---|
| Width ≥ 1024px? | Below ~1024 the lockup and the 1200×630 OG image both look soft and a vector master is required | **Unknown** |
| Alpha channel? | The mark sits on white in the header and on a crimson band in the footer. A baked white box fails the second | **Unknown** — corners render white, but white ≠ transparent |
| Clean edges? | A seal re-exported through JPEG carries a halo that is obvious at 2× against white | **Unknown** |
| Baked padding? | The header must control its own spacing | Appears tight — outer ring runs to ~1–2% of the edge |

Run `inspect_logo.py` against the committed file before phase 7 and record the results here.

**Request an SVG master regardless of the PNG's size.** Print, signage, and the simplified favicon
mark all need one, and a vector removes the derivative-quality question permanently. For an official
seal there is almost certainly an authoritative vector held by the institution — ask for it rather
than tracing the raster.

Derivatives to generate from the master (script this, don't hand-export):

| Output | Size | Use |
|---|---|---|
| `logo-lockup.svg` | seal ≥600px wide + typeset name | Header, rendered at ≤120px tall |
| `seal.svg` / `seal@2x.png` | ≥600px | Standalone mark, About page, documents |
| `favicon.ico` | 16 / 32 / 48 | Browser tab — **simplified mark** |
| `apple-touch-icon.png` | 180×180 | iOS home screen |
| `icon-192.png`, `icon-512.png` | as named | PWA manifest |
| `icon-maskable-512.png` | 512×512, 20% safe padding | Android adaptive icon |
| `og-default.png` | 1200×630 | Social and LINE link previews — seal **plus** the institution name; the seal alone is unreadable in a chat thumbnail |

The LINE link preview matters more than usual here — it is the image people see when the OA link gets
forwarded, which is the site's main distribution path.

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

### Other locales — deferred, not deleted

**v1 ships Thai only.** The `*_i18n` tables are still built in phase 1 exactly as SPEC.md §6
specifies, and `locales` still carries `is_enabled`; adding a language stays a row insert. What v1
does not ship is public English or Chinese routes, because serving three hreflang'd URLs of identical
Thai text is worse for SEO than serving one, and no translator has been assigned (SPEC.md §14.5).

Keep the following so the layouts are already safe when a locale is switched on:

- **Every layout must survive text expansion.** English strings run 15–30% longer than Thai; Chinese
  runs shorter but taller. No fixed-width buttons, no single-line assumptions on headings, no
  truncation that hides meaning. Test at 360px.
- English will use **Inter** at the same scale, with body `line-height` dropping to `1.7` — Thai's
  `1.8` looks loose set in Latin.
- Chinese will use a **system CJK stack** (`"PingFang SC", "Noto Sans SC", "Microsoft YaHei",
  sans-serif`), not Anuphan, which has no CJK coverage. Body `line-height: 1.9`, `letter-spacing:
  0.02em` — the one place tracking is allowed.
- `lang` and `dir` set per locale from day one, even with one locale enabled.

---

