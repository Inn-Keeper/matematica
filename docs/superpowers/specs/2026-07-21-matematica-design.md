# Matematica — Personal Finances Monorepo Design

**Date:** 2026-07-21
**Status:** Approved

## Purpose

Replace month-to-month Excel budget tables with a web + mobile app. The core
loop: plan category amounts for a month, record transactions against them,
see planned vs. actual at a glance. An AI chat answers questions about the
current month's finances.

## Decisions (user-confirmed)

- **Budget model:** planned vs. actual per category, plus a per-month
  transaction ledger. The ledger feeds the actuals.
- **Backend:** Supabase (auth, Postgres with RLS).
- **AI scope:** working monthly insights chat on day one, served by a
  separate Python API repo mirroring `ativscrum-ai-api` (user-confirmed,
  for consistency across projects).
- **Data entry:** manual only. No CSV/OFX/Excel import.
- **Architecture:** approach A — rollups computed client-side in core from
  raw transactions; the DB stores only facts. No SQL views, no shared UI
  package.

## Assumptions

- Package scope `@matematica/*`.
- Single currency: BRL, integer cents, pt-BR formatting.
- Tailwind on web; React Native primitives on mobile.
- Structure mirrors the `stretchy` monorepo (pnpm workspaces, same script
  conventions).

## Repository structure

```
matematica/
  package.json            workspace root: dev/build/test/typecheck/lint/verify scripts
  pnpm-workspace.yaml
  tsconfig.base.json
  eslint.config.mjs / prettier.config.mjs
  apps/
    web/                  Vite + React 19 + supabase-js + Tailwind
    mobile/               Expo + expo-router + supabase-js
  packages/
    core/                 @matematica/core — pure TS, main: src/index.ts
  supabase/
    migrations/           schema below

../matematica-ai-api/     sibling repo — Python insights API (see AI section)
```

## Data model

All tables have `id uuid pk`, `user_id uuid` (FK to `auth.users`),
`created_at`. RLS: every table restricted to `auth.uid() = user_id`.
Amounts are `integer` cents. Months are `text 'YYYY-MM'`.

- **categories** — `name text`, `kind text check (kind in ('income','expense'))`,
  `archived boolean default false`. Unique `(user_id, name)`.
- **budgets** — `category_id`, `month`, `planned_cents integer`.
  Unique `(user_id, category_id, month)`.
- **transactions** — `category_id`, `date date`, `amount_cents integer`
  (always positive; sign derived from category kind), `description text`.

## Core package (`@matematica/core`)

- `types.ts` — `Category`, `Budget`, `Transaction`, `MonthSummary`,
  `CategoryRow`.
- `tokens.ts` — shared design tokens (stretchy pattern): typed const
  objects for color, font, radius, spacing, motion durations/easings.
  Single source of truth; web maps them into Tailwind config, mobile
  consumes them directly in styles.
- `money.ts` — cents ↔ display formatting (`Intl.NumberFormat('pt-BR')`).
- `rollup.ts` — `summarizeMonth(categories, budgets, transactions) →
  MonthSummary` (per-category planned/actual/diff, income total, expense
  total, remaining). Pure function; the app's only non-trivial logic.
- `data.ts` — Supabase queries: fetch month data, CRUD categories/budgets/
  transactions, `copyPlanFromPreviousMonth(month)`.
- `insights.ts` — client helper that calls the AI API's `/insights/chat`
  endpoint (URL from env) forwarding the user's Supabase access token,
  and exposes the streamed reply.
- Tests: Vitest on `rollup.ts` and `money.ts`.

## Main flow (both apps)

One screen — the month view:

1. Month picker header (previous/next, defaults to current month).
2. Summary table: per expense category planned / actual / diff; income
   planned/actual; remaining (income actual − expense actual).
3. Ledger: the month's transactions, newest first, with inline delete.
4. Quick-add form: date (defaults today), category, amount, description.
5. Empty month with a prior plan → "copy last month's plan" action.

Secondary: minimal category management (add/rename/archive) and the AI
chat panel. Auth: Supabase email magic-link (same as stretchy).

## Design system & motion

- All visual values come from `tokens.ts` in core — no hardcoded colors,
  radii, or durations in either app.
- **Web:** `motion` (motion.dev, the framer-motion successor) for
  component/layout animation — month transitions, row enter/exit, diff
  number changes. GSAP deferred: Motion covers everything v1 animates;
  add GSAP only if a complex scrubbed timeline shows up.
- **Mobile:** `react-native-reanimated` (same as stretchy) driven by the
  same motion tokens (durations/easings), so both apps move consistently.

## AI insights chat — `matematica-ai-api` (separate repo)

A standalone Python service mirroring the `ativscrum-ai-api` layout:
FastAPI + uvicorn + pydantic (pinned versions), flat `app/` module
(`main.py`, `config.py`, `schemas.py`, `errors.py`, `supabase.py`,
`context.py`, `prompts.py`, `claude.py`, `service.py`), `Dockerfile`,
`.env.example`, `tests/` with pytest + ruff.

- **Endpoint `POST /insights/chat`:** takes `month` + chat messages,
  requires the caller's Supabase access token as a Bearer header.
- **Auth & data:** validates the token against Supabase's `/auth/v1/user`
  endpoint, then queries Supabase PostgREST with that same user token so
  RLS applies — the service holds no service-role key and can only read
  what the user can.
- **Model call:** builds a compact month context (budgets + transactions)
  and calls Gemini free tier (`gemini-2.5-flash`) through `gemini.py`
  using httpx directly — same as ativscrum-ai-api, no extra SDK dep —
  then streams the reply to the client as SSE. Free-tier rate limits are
  acceptable for personal use; surface 429s to the client as a friendly
  "try again shortly" error.
- **Secrets:** `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`
  as service env vars only (anon key is public by nature, but still
  env-configured). The Gemini key clients never see.
- **Client:** chat panel (web and mobile) holding message history in
  component state; no persistence of chat history in v1.

## Error handling

- Supabase query errors surface to the UI as inline error states — never
  swallowed.
- The AI API returns proper HTTP errors (401 unauthenticated, 502 with
  a generic message on upstream Claude failure) and logs details
  server-side.
- Quick-add validates: amount > 0, category required, valid date.

## Testing

- `packages/core`: Vitest unit tests for `rollup.ts` (mixed
  income/expense, category with plan but no transactions and vice versa,
  empty month) and `money.ts` formatting.
- `matematica-ai-api`: pytest on context assembly and prompt building
  (Claude calls mocked); ruff for lint.
- Apps: typecheck + lint only in v1; e2e deferred until flows stabilize.
- Root `verify` script: typecheck + lint + format:check + test + build.

## Out of scope (v1)

- CSV/OFX/Excel import, multi-currency, recurring transactions, envelope
  rollover, shared budgets/multi-user, chat history persistence,
  shared UI package.
