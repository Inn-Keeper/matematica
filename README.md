# matematica

Personal month-to-month finances — web + mobile replacing the old Excel sheet.

## Layout

- `apps/web` — Vite + React
- `apps/mobile` — Expo
- `packages/core` — shared types, tokens, money math, rollups, data layer
- `supabase/` — schema migrations
- AI assistant lives in the sibling repo `matematica-ai-api`

## Setup

1. `pnpm install`
2. Create a Supabase project, apply `supabase/migrations/`, enable email OTP auth.
3. Copy `apps/web/.env.example` → `apps/web/.env.local` and fill in.
4. Copy `apps/mobile/.env.example` → `apps/mobile/.env` and fill in.
5. `pnpm dev:web` / `pnpm dev:mobile`

## Checks

`pnpm verify` — typecheck, lint, format, tests, build.
