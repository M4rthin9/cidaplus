## What this changes

_One or two sentences: what the PR does and the user-visible difference._

## Verification

- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm format:check`
- [ ] `pnpm test`
- [ ] Related SPEC.md / DESIGN.md sections read and honoured

## Conventions checked

- [ ] Server Actions for mutations, same Zod schema as the form
- [ ] `audit_log` written on every mutation
- [ ] Translatable text in `*_i18n`, Thai fallback, no machine translation
- [ ] No hard-coded LINE URL / phone / email / hex colour
- [ ] No `any`, no unjustified non-null assertions

_Do not merge with unchecked required boxes._