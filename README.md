# matematica

Personal month-to-month finances — web + mobile replacing the old Excel sheet.

## Layout

- `apps/web` — Vite + React
- `apps/mobile` — Expo
- `packages/core` — shared types, tokens, money math, rollups, data layer
- `supabase/` — schema migrations
- AI assistant lives in the sibling repo `matematica-ai-api`
- Future ideas are tracked in [`docs/FUTURE_FEATURES.md`](docs/FUTURE_FEATURES.md)

## Setup

1. `pnpm install`
2. Create a Supabase project, apply every file in `supabase/migrations/`, and
   enable email OTP auth.
3. Copy `apps/web/.env.example` → `apps/web/.env.local` and fill in.
4. Copy `apps/mobile/.env.example` → `apps/mobile/.env.local` and fill in.
5. `pnpm dev:web` / `pnpm dev:mobile`

For magic links, add each deployed web origin and `matematica://**` to the
Supabase redirect allowlist. The email template must honor the request's
redirect URL rather than always sending users to the Site URL. Anonymous sign
in is a development-only fallback and is omitted from production builds.

## Mobile builds

The Expo app is linked to `@innkeeper/matematica`. Configure the three
`EXPO_PUBLIC_*` variables in the matching EAS environment, then build with:

```bash
cd apps/mobile
eas build --platform ios --profile preview-simulator
eas build --platform android --profile preview
```

The simulator profile produces a standalone iOS app so native magic-link
callbacks can be tested without Expo Go.

## Checks

`pnpm verify` — typecheck, lint, format, tests, build.
