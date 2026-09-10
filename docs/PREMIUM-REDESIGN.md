# Premium storefront redesign — 10 September 2026

The repository already contains a complete Next.js 15 catalog, PostgreSQL/Drizzle content model,
Auth.js admin, CMS section builder, and LINE handoff. The main presentation gaps were the oversized
seal-led homepage, repeated empty image panels, limited heading hierarchy, and a mobile header that
placed the menu on a separate row. This revision changes the storefront presentation while keeping
the existing application and content ownership.

## Visual decisions

- Preserve the official seal, measured crimson, white backgrounds, and green reserved for LINE.
- Set a split editorial hero with a restrained arched image, large Anuphan typography, and clear
  product browsing and LINE actions. Keep the institution visible above the fold.
- Use whitespace and type hierarchy for separation; no promotional claims, discounts, invented
  impact statistics, or simulated product photography.
- Show categories as a compact two-column collection, retaining their descriptions and live counts.
  Missing category photos no longer consume a large empty panel. News without photography uses
  a text-led article treatment. Product cards continue to show the honest missing-photo state.
- Keep all colors in the existing theme variables. Add `--space-section` (56–96px),
  `--type-display` (32–60px), and `--type-section` (28–40px). Cards and controls still use
  their existing configurable radius. Thai body leading remains 1.8; heading leading is at least
  1.45; Thai tracking remains zero.
- Use one-column mobile layouts, two-column mobile product grids, wrapping CTAs, visible focus
  rings, reduced-motion support, and Escape-to-close mobile navigation with focus restoration.

These layout and type updates implement the requested premium redesign and supersede the earlier
homepage silhouette and heading sizes in DESIGN.md. Its brand, language, accessibility, data, and
contact-channel requirements remain applicable.

## CMS behavior

A saved homepage still takes precedence over defaults. New defaults live in
`src/lib/pages/default-home.ts` and are also used by the design preview. The hero's optional
`useCraftIllustration` field can be toggled in the existing section editor. A selected media-library
image takes precedence over the illustration. Existing hero blocks without the field retain their
no-illustration behavior. To use the new hero on an already configured homepage, edit that block in
Admin → Pages; no content is overwritten automatically.

Header and footer presentation now live in shared view components; their server wrappers still
load the same settings, menus, categories, locales, and contact channels. Product, category, search,
news, LINE tracking, admin authentication, and enquiry persistence retain their existing backends.

## Review preview

`pnpm build:preview` generates 33 static storefront pages into ignored `out/`. It uses the real
header, footer, section, product-card, navigation, and news-card components, with isolated navigation
and seed-data adapters. Product/category details, search, sorting, and a sample contact form support
reviewing the design without a database. Seed copy and example prices are explicitly labeled.

The preview does not contain admin, API handlers, analytics, or live mutations. LINE links open an
explanation within the preview. The sample contact form validates inputs but sends and stores nothing.
This preview is not a replacement for the production server.

Normal `pnpm build` still runs `next build`. `CIDA_PREVIEW=1 pnpm build` selects the same preview
builder for Sites. Production Docker/CI retains its Node 22 / PostgreSQL build path. Dependencies and
the lockfile are unchanged. `build/` and `out/` are excluded from lint because they are generated output.

## Hero asset

`public/images/craft-hero.webp` (1254px) and `craft-hero-640.webp` (640px) are optimized renditions of
one image generated with the built-in image tool. The caption explicitly identifies it as an
AI-created craft illustration, not an actual product. It is never used as a catalog product photo.
No social-preview image was changed.

Prompt: Premium editorial craft still life for a Thai vocational handicraft catalog: carefully
handcrafted ivory and deep burgundy paper/fabric flowers in a minimal earthen vase, folded natural
embroidered linen, a small spool of thread and discreet scissors on a stone worktable. Square
composition with the full vase visible; soft window light, believable handmade texture, warm neutral
studio backdrop, calm and respectful. No people, logos, official seal, text, watermark, interface,
gold decoration, or festive styling. An illustrative scene, not a claimed photograph of a product.

## Verification

- TypeScript: pass.
- ESLint: pass.
- Existing Vitest suite: 24 files, 216 tests pass.
- Standalone preview: 33 pages generated; local asset and navigation references checked.
- Next.js production compilation checked separately; full database-backed prerender/runtime and
  browser visual tests require the production-compatible environment and were not exercised here.
- This workspace runs Node 24 and its available pnpm shim; the repository continues to require
  Node 22 and pnpm 10.33.0 for production. Existing CI remains the full PostgreSQL integration gate.
