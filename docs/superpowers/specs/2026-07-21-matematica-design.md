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
- **Backend:** Supabase (auth, Postgres with RLS, Edge Functions).
- **AI scope:** working monthly insights chat on day one.
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
    functions/
      insights-chat/      Edge Function calling Claude
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
- `money.ts` — cents ↔ display formatting (`Intl.NumberFormat('pt-BR')`).
- `rollup.ts` — `summarizeMonth(categories, budgets, transactions) →
  MonthSummary` (per-category planned/actual/diff, income total, expense
  total, remaining). Pure function; the app's only non-trivial logic.
- `data.ts` — Supabase queries: fetch month data, CRUD categories/budgets/
  transactions, `copyPlanFromPreviousMonth(month)`.
- `insights.ts` — client helper that calls the `insights-chat` Edge
  Function and exposes the streamed reply.
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

## AI insights chat

- **Edge Function `insights-chat`:** verifies the caller's Supabase JWT,
  loads that user's budgets + transactions for the requested month, builds
  a compact context block, calls the Claude API (`claude-sonnet-5`) with
  the user's chat messages, streams the response back (SSE).
- **Secrets:** `ANTHROPIC_API_KEY` set as a Supabase function secret only.
  Clients never see it.
- **Client:** chat panel (web and mobile) holding message history in
  component state; no persistence of chat history in v1.

## Error handling

- Supabase query errors surface to the UI as inline error states — never
  swallowed.
- Edge Function returns proper HTTP errors (401 unauthenticated, 502 with
  a generic message on upstream Claude failure) and logs details
  server-side.
- Quick-add validates: amount > 0, category required, valid date.

## Testing

- `packages/core`: Vitest unit tests for `rollup.ts` (mixed
  income/expense, category with plan but no transactions and vice versa,
  empty month) and `money.ts` formatting.
- Apps: typecheck + lint only in v1; e2e deferred until flows stabilize.
- Root `verify` script: typecheck + lint + format:check + test + build.

## Out of scope (v1)

- CSV/OFX/Excel import, multi-currency, recurring transactions, envelope
  rollover, shared budgets/multi-user, chat history persistence,
  shared UI package.
