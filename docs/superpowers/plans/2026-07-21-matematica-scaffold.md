# Matematica Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the matematica personal-finances monorepo (web + mobile + core + Supabase schema) and the sibling `matematica-ai-api` FastAPI/Gemini service, per `docs/superpowers/specs/2026-07-21-matematica-design.md`.

**Architecture:** pnpm workspace mirroring stretchy: `apps/web` (Vite + React 19 + Tailwind + Motion), `apps/mobile` (Expo + expo-router + Reanimated), `packages/core` (pure TS: types, tokens, money, rollup, Supabase data layer, insights SSE client). Rollups computed client-side. AI chat served by a separate FastAPI repo calling Gemini free tier, auth via the user's Supabase token (RLS applies).

**Tech Stack:** pnpm, TypeScript, React 19, Vite 6, Tailwind 4, motion, Expo, react-native-reanimated, supabase-js 2, Vitest, Python 3.11+, FastAPI, httpx, pytest, ruff.

## Global Constraints

- Amounts are integer cents; months are `'YYYY-MM'` strings; currency BRL, pt-BR formatting.
- All visual values come from `@matematica/core` tokens — no hardcoded colors/radii/durations in apps. Tailwind is used for layout utilities only; token values go in via `style` props (single source of truth, no codegen).
- No new deps beyond those named per-task. No service-role key anywhere.
- Commits: conventional style, no AI attribution trailers.
- Errors never swallowed: Supabase/API errors surface as inline UI states; server logs details, returns generic messages.
- Monorepo lives at `/Users/daltoncastro/Documents/Projects/matematica`; the AI API at `/Users/daltoncastro/Documents/Projects/matematica-ai-api` (own git repo).

---

## Part A — monorepo

### Task 1: Workspace root

**Files:**

- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.npmrc`, `prettier.config.mjs`, `eslint.config.mjs`

**Interfaces:**

- Produces: workspace scripts `dev:web`, `dev:mobile`, `test`, `typecheck`, `lint`, `verify` used by every later task.

- [ ] **Step 1: Write root config files**

`pnpm-workspace.yaml`:

```yaml
packages:
  - apps/*
  - packages/*
```

`.npmrc`:

```
node-linker=hoisted
```

`package.json`:

```json
{
  "name": "matematica",
  "private": true,
  "packageManager": "pnpm@10.6.5",
  "scripts": {
    "dev": "pnpm dev:web",
    "dev:web": "pnpm --filter web dev",
    "dev:mobile": "pnpm --filter mobile start",
    "build": "pnpm --filter web build",
    "test": "pnpm --filter @matematica/core test",
    "typecheck": "pnpm --filter @matematica/core typecheck && pnpm --filter web typecheck && pnpm --filter mobile typecheck",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "verify": "pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build"
  },
  "devDependencies": {
    "@eslint/js": "^9.0.0",
    "eslint": "^9.0.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "globals": "^16.0.0",
    "prettier": "^3.4.0",
    "typescript": "^5.7.0",
    "typescript-eslint": "^8.20.0"
  }
}
```

`tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "skipLibCheck": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

`.gitignore`:

```
node_modules/
dist/
.expo/
.env
.env.local
*.local
.DS_Store
._*
```

`prettier.config.mjs`:

```js
export default {};
```

`eslint.config.mjs`:

```js
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/.expo/**", "**/node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
);
```

- [ ] **Step 2: Install and verify**

Run: `pnpm install && pnpm lint`
Expected: install succeeds; eslint exits 0 (no files yet is fine).

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chore: workspace root scaffold"
```

### Task 2: Core package — types + tokens

**Files:**

- Create: `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/src/index.ts`, `packages/core/src/types.ts`, `packages/core/src/tokens.ts`

**Interfaces:**

- Produces: types `Category`, `Budget`, `Transaction`, `MonthSummary`, `CategoryRow`, `Kind`; token objects `color`, `font`, `radius`, `space`, `motionTokens` — imported by every app task.

- [ ] **Step 1: Write package config**

`packages/core/package.json`:

```json
{
  "name": "@matematica/core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.49.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

`packages/core/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "types": ["vitest/globals"] },
  "include": ["src"]
}
```

- [ ] **Step 2: Write types.ts**

```ts
export type Kind = "income" | "expense";

export interface Category {
  id: string;
  name: string;
  kind: Kind;
  archived: boolean;
}

export interface Budget {
  id: string;
  category_id: string;
  month: string; // 'YYYY-MM'
  planned_cents: number;
}

export interface Transaction {
  id: string;
  category_id: string;
  date: string; // 'YYYY-MM-DD'
  amount_cents: number; // always positive; sign derived from category kind
  description: string;
}

export interface CategoryRow {
  category: Category;
  plannedCents: number;
  actualCents: number;
  /** positive = favorable: under budget for expenses, above plan for income */
  diffCents: number;
}

export interface MonthSummary {
  rows: CategoryRow[];
  incomePlannedCents: number;
  incomeActualCents: number;
  expensePlannedCents: number;
  expenseActualCents: number;
  /** incomeActual - expenseActual */
  remainingCents: number;
}
```

- [ ] **Step 3: Write tokens.ts**

```ts
// Shared design tokens — single source of truth for both apps (stretchy pattern).

export const color = {
  screen: "#0B0D0F",
  card: "#14171A",
  cardAlt: "#101316",
  hairline: "rgba(255,255,255,0.07)",

  text: "#F2F4F5",
  textSecondary: "#9BA3A8",
  textMuted: "#6E767C",

  brand: "#2DD4BF", // teal — matematica identity
  brandSoft: "rgba(45,212,191,0.14)",

  income: "#4ED99A",
  incomeBg: "rgba(78,217,154,0.12)",
  expense: "#FF7B7B",
  expenseBg: "rgba(255,123,123,0.12)",
  warning: "#FFB454",
} as const;

export const font = {
  display: "'Space Grotesk', sans-serif",
  body: "'DM Sans', sans-serif",
  mono: "'Space Mono', monospace", // all money figures render in mono
} as const;

export const radius = { card: 16, control: 10, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 } as const;

export const motionTokens = {
  duration: { fast: 0.15, base: 0.25, slow: 0.4 },
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
} as const;
```

- [ ] **Step 4: Write index.ts barrel**

```ts
export * from "./types";
export * from "./tokens";
```

- [ ] **Step 5: Verify and commit**

Run: `pnpm install && pnpm --filter @matematica/core typecheck`
Expected: exits 0.

```bash
git add -A && git commit -m "feat(core): types and design tokens"
```

### Task 3: Core money math (TDD)

**Files:**

- Create: `packages/core/src/money.ts`, `packages/core/src/money.test.ts`
- Modify: `packages/core/src/index.ts` (add `export * from "./money";`)

**Interfaces:**

- Produces: `formatBRL(cents: number): string`, `parseAmountToCents(input: string): number | null`.

- [ ] **Step 1: Write the failing tests**

`packages/core/src/money.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatBRL, parseAmountToCents } from "./money";

const nbsp = " ";

describe("formatBRL", () => {
  it("formats cents as pt-BR currency", () => {
    expect(formatBRL(123456)).toBe(`R$${nbsp}1.234,56`);
    expect(formatBRL(0)).toBe(`R$${nbsp}0,00`);
    expect(formatBRL(-5000)).toBe(`-R$${nbsp}50,00`);
  });
});

describe("parseAmountToCents", () => {
  it("parses pt-BR style", () => {
    expect(parseAmountToCents("1.234,56")).toBe(123456);
    expect(parseAmountToCents("742,00")).toBe(74200);
  });
  it("parses dot-decimal style", () => {
    expect(parseAmountToCents("1234.56")).toBe(123456);
  });
  it("parses bare integers as whole reais", () => {
    expect(parseAmountToCents("50")).toBe(5000);
  });
  it("rejects garbage", () => {
    expect(parseAmountToCents("")).toBeNull();
    expect(parseAmountToCents("abc")).toBeNull();
    expect(parseAmountToCents("-10")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `pnpm --filter @matematica/core test`
Expected: FAIL — cannot resolve `./money`.

- [ ] **Step 3: Implement money.ts**

```ts
const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

/** Accepts "1.234,56", "1234.56", "50". Returns integer cents, or null if invalid/negative. */
export function parseAmountToCents(input: string): number | null {
  const raw = input.trim().replace(/\s|R\$/g, "");
  if (!/^[\d.,]+$/.test(raw)) return null;
  let normalized: string;
  if (raw.includes(",")) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = raw;
  }
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `pnpm --filter @matematica/core test`
Expected: PASS (all money tests green).

- [ ] **Step 5: Export and commit**

Add to `packages/core/src/index.ts`: `export * from "./money";`

```bash
git add -A && git commit -m "feat(core): BRL money formatting and parsing"
```

### Task 4: Core month rollup (TDD)

**Files:**

- Create: `packages/core/src/rollup.ts`, `packages/core/src/rollup.test.ts`, `packages/core/src/month.ts`
- Modify: `packages/core/src/index.ts` (add exports)

**Interfaces:**

- Consumes: types from Task 2.
- Produces: `summarizeMonth(categories: Category[], budgets: Budget[], transactions: Transaction[]): MonthSummary`; month utils `currentMonth(): string`, `addMonths(month: string, delta: number): string`, `monthDateRange(month: string): { start: string; end: string }` (end exclusive), `previousMonth(month: string): string`.

- [ ] **Step 1: Write failing tests**

`packages/core/src/rollup.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { summarizeMonth } from "./rollup";
import { addMonths, monthDateRange, previousMonth } from "./month";
import type { Budget, Category, Transaction } from "./types";

const cat = (
  id: string,
  kind: "income" | "expense",
  archived = false,
): Category => ({
  id,
  name: id,
  kind,
  archived,
});
const bud = (category_id: string, planned_cents: number): Budget => ({
  id: `b-${category_id}`,
  category_id,
  month: "2026-07",
  planned_cents,
});
const tx = (category_id: string, amount_cents: number): Transaction => ({
  id: `t-${category_id}-${amount_cents}`,
  category_id,
  date: "2026-07-10",
  amount_cents,
  description: "",
});

describe("summarizeMonth", () => {
  it("computes planned/actual/diff for mixed kinds", () => {
    const cats = [cat("salary", "income"), cat("food", "expense")];
    const s = summarizeMonth(
      cats,
      [bud("salary", 800000), bud("food", 90000)],
      [tx("salary", 800000), tx("food", 74200)],
    );
    const food = s.rows.find((r) => r.category.id === "food")!;
    expect(food.diffCents).toBe(15800); // under budget = favorable
    expect(s.remainingCents).toBe(800000 - 74200);
    expect(s.expensePlannedCents).toBe(90000);
  });

  it("income diff is actual minus planned", () => {
    const s = summarizeMonth(
      [cat("salary", "income")],
      [bud("salary", 800000)],
      [tx("salary", 850000)],
    );
    expect(s.rows[0]!.diffCents).toBe(50000);
  });

  it("includes categories with a plan but no transactions, and vice versa", () => {
    const cats = [cat("rent", "expense"), cat("surprise", "expense")];
    const s = summarizeMonth(
      cats,
      [bud("rent", 250000)],
      [tx("surprise", 1000)],
    );
    expect(s.rows.map((r) => r.category.id).sort()).toEqual([
      "rent",
      "surprise",
    ]);
    expect(s.rows.find((r) => r.category.id === "rent")!.actualCents).toBe(0);
    expect(s.rows.find((r) => r.category.id === "surprise")!.plannedCents).toBe(
      0,
    );
  });

  it("empty month yields empty summary", () => {
    const s = summarizeMonth([cat("food", "expense")], [], []);
    expect(s.rows).toEqual([]);
    expect(s.remainingCents).toBe(0);
  });

  it("archived categories with month data still appear", () => {
    const s = summarizeMonth(
      [cat("old", "expense", true)],
      [],
      [tx("old", 500)],
    );
    expect(s.rows).toHaveLength(1);
  });
});

describe("month utils", () => {
  it("addMonths crosses year boundaries", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
  });
  it("previousMonth", () => {
    expect(previousMonth("2026-07")).toBe("2026-06");
  });
  it("monthDateRange is end-exclusive", () => {
    expect(monthDateRange("2026-07")).toEqual({
      start: "2026-07-01",
      end: "2026-08-01",
    });
    expect(monthDateRange("2026-12")).toEqual({
      start: "2026-12-01",
      end: "2027-01-01",
    });
  });
});
```

- [ ] **Step 2: Run tests, verify fail**

Run: `pnpm --filter @matematica/core test`
Expected: FAIL — cannot resolve `./rollup` / `./month`.

- [ ] **Step 3: Implement month.ts**

```ts
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

export function previousMonth(month: string): string {
  return addMonths(month, -1);
}

/** End-exclusive ISO date range covering the month. */
export function monthDateRange(month: string): { start: string; end: string } {
  return { start: `${month}-01`, end: `${addMonths(month, 1)}-01` };
}
```

- [ ] **Step 4: Implement rollup.ts**

```ts
import type { Budget, Category, MonthSummary, Transaction } from "./types";

/** Pure rollup: rows for every category with a plan or activity this month. */
export function summarizeMonth(
  categories: Category[],
  budgets: Budget[],
  transactions: Transaction[],
): MonthSummary {
  const byCategory = new Map(categories.map((c) => [c.id, c]));
  const planned = new Map<string, number>();
  for (const b of budgets) {
    planned.set(
      b.category_id,
      (planned.get(b.category_id) ?? 0) + b.planned_cents,
    );
  }
  const actual = new Map<string, number>();
  for (const t of transactions) {
    actual.set(
      t.category_id,
      (actual.get(t.category_id) ?? 0) + t.amount_cents,
    );
  }

  const ids = new Set([...planned.keys(), ...actual.keys()]);
  const rows = [...ids]
    .map((id) => byCategory.get(id))
    .filter((c): c is Category => c !== undefined)
    .map((category) => {
      const plannedCents = planned.get(category.id) ?? 0;
      const actualCents = actual.get(category.id) ?? 0;
      const diffCents =
        category.kind === "expense"
          ? plannedCents - actualCents
          : actualCents - plannedCents;
      return { category, plannedCents, actualCents, diffCents };
    })
    .sort((a, b) => a.category.name.localeCompare(b.category.name));

  const sum = (
    kind: "income" | "expense",
    pick: (r: (typeof rows)[number]) => number,
  ) =>
    rows
      .filter((r) => r.category.kind === kind)
      .reduce((acc, r) => acc + pick(r), 0);

  const incomeActualCents = sum("income", (r) => r.actualCents);
  const expenseActualCents = sum("expense", (r) => r.actualCents);

  return {
    rows,
    incomePlannedCents: sum("income", (r) => r.plannedCents),
    incomeActualCents,
    expensePlannedCents: sum("expense", (r) => r.plannedCents),
    expenseActualCents,
    remainingCents: incomeActualCents - expenseActualCents,
  };
}
```

- [ ] **Step 5: Run tests, verify pass; export; commit**

Run: `pnpm --filter @matematica/core test` — Expected: PASS.

Add to `packages/core/src/index.ts`:

```ts
export * from "./month";
export * from "./rollup";
```

```bash
git add -A && git commit -m "feat(core): month utils and planned-vs-actual rollup"
```

### Task 5: Supabase schema

**Files:**

- Create: `supabase/migrations/20260721000000_init.sql`, `supabase/config.toml` (via CLI if available, else migration only)

**Interfaces:**

- Produces: tables `categories`, `budgets`, `transactions` with RLS — consumed by core data layer and the AI API.

- [ ] **Step 1: Write the migration**

`supabase/migrations/20260721000000_init.sql`:

```sql
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('income', 'expense')),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  planned_cents integer not null check (planned_cents >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, category_id, month)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  date date not null,
  amount_cents integer not null check (amount_cents > 0),
  description text not null default '',
  created_at timestamptz not null default now()
);

create index transactions_user_date_idx on public.transactions (user_id, date);
create index budgets_user_month_idx on public.budgets (user_id, month);

alter table public.categories enable row level security;
alter table public.budgets enable row level security;
alter table public.transactions enable row level security;

create policy "own categories" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own budgets" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- [ ] **Step 2: Verify**

If `supabase` CLI is installed: `supabase init` (accept defaults, skip if config exists) then `supabase db lint` — Expected: no errors. If the CLI is absent, note it in the commit and move on (the SQL is applied when the user links their project).

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(db): initial schema with RLS"
```

### Task 6: Core data layer + insights client

**Files:**

- Create: `packages/core/src/data.ts`, `packages/core/src/insights.ts`, `packages/core/src/insights.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**

- Consumes: `SupabaseClient` from `@supabase/supabase-js`; types + month utils.
- Produces (used by both apps):
  - `fetchMonthData(sb, month): Promise<{ categories: Category[]; budgets: Budget[]; transactions: Transaction[] }>`
  - `addTransaction(sb, input: { category_id: string; date: string; amount_cents: number; description: string }): Promise<void>`
  - `deleteTransaction(sb, id: string): Promise<void>`
  - `upsertBudget(sb, input: { category_id: string; month: string; planned_cents: number }): Promise<void>`
  - `addCategory(sb, input: { name: string; kind: Kind }): Promise<void>`
  - `renameCategory(sb, id: string, name: string): Promise<void>`
  - `setCategoryArchived(sb, id: string, archived: boolean): Promise<void>`
  - `copyPlanFromPreviousMonth(sb, month): Promise<number>` (returns rows copied)
  - `streamInsights(opts: { apiUrl: string; accessToken: string; month: string; messages: ChatMessage[] }): AsyncGenerator<string>` and `type ChatMessage = { role: "user" | "assistant"; text: string }`
  - `parseSseData(chunk: string): string[]` (exported for tests)

- [ ] **Step 1: Write failing test for SSE parsing**

`packages/core/src/insights.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseSseData } from "./insights";

describe("parseSseData", () => {
  it("extracts data payloads from SSE text", () => {
    expect(
      parseSseData('data: {"text": "olá"}\n\ndata: {"text": " mundo"}\n\n'),
    ).toEqual(['{"text": "olá"}', '{"text": " mundo"}']);
  });
  it("ignores comments, blank lines and [DONE]", () => {
    expect(parseSseData(": ping\n\ndata: [DONE]\n\n")).toEqual([]);
  });
});
```

Run: `pnpm --filter @matematica/core test` — Expected: FAIL (module missing).

- [ ] **Step 2: Implement insights.ts**

```ts
export type ChatMessage = { role: "user" | "assistant"; text: string };

/** Extract `data:` payloads from an SSE text block, skipping comments and [DONE]. */
export function parseSseData(chunk: string): string[] {
  return chunk
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .filter((payload) => payload.length > 0 && payload !== "[DONE]");
}

export interface StreamInsightsOptions {
  apiUrl: string;
  accessToken: string;
  month: string;
  messages: ChatMessage[];
}

/** Streams assistant text chunks from the matematica-ai-api /insights/chat endpoint. */
export async function* streamInsights(
  opts: StreamInsightsOptions,
): AsyncGenerator<string> {
  const res = await fetch(`${opts.apiUrl}/insights/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.accessToken}`,
    },
    body: JSON.stringify({ month: opts.month, messages: opts.messages }),
  });
  if (!res.ok) {
    throw new Error(
      res.status === 429
        ? "O assistente está ocupado. Tente novamente em instantes."
        : `Falha no assistente (${res.status}).`,
    );
  }
  // ponytail: RN fetch has no body stream — fall back to buffering the full reply.
  if (!res.body) {
    for (const payload of parseSseData(await res.text())) {
      yield JSON.parse(payload).text as string;
    }
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const payload of parseSseData(events.join("\n\n") + "\n\n")) {
      yield JSON.parse(payload).text as string;
    }
  }
}
```

Run: `pnpm --filter @matematica/core test` — Expected: PASS.

- [ ] **Step 3: Implement data.ts**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { monthDateRange, previousMonth } from "./month";
import type { Budget, Category, Kind, Transaction } from "./types";

// Every function throws on Supabase error — callers surface it in the UI.
function unwrap<T>(result: {
  data: T | null;
  error: { message: string } | null;
}): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error("Resposta vazia do Supabase.");
  return result.data;
}

export async function fetchMonthData(sb: SupabaseClient, month: string) {
  const { start, end } = monthDateRange(month);
  const [categories, budgets, transactions] = await Promise.all([
    sb.from("categories").select("id,name,kind,archived").order("name"),
    sb
      .from("budgets")
      .select("id,category_id,month,planned_cents")
      .eq("month", month),
    sb
      .from("transactions")
      .select("id,category_id,date,amount_cents,description")
      .gte("date", start)
      .lt("date", end)
      .order("date", { ascending: false }),
  ]);
  return {
    categories: unwrap(categories) as Category[],
    budgets: unwrap(budgets) as Budget[],
    transactions: unwrap(transactions) as Transaction[],
  };
}

export async function addTransaction(
  sb: SupabaseClient,
  input: {
    category_id: string;
    date: string;
    amount_cents: number;
    description: string;
  },
) {
  const user = unwrap(await sb.auth.getUser()).user;
  unwrap(
    await sb
      .from("transactions")
      .insert({ ...input, user_id: user.id })
      .select(),
  );
}

export async function deleteTransaction(sb: SupabaseClient, id: string) {
  unwrap(await sb.from("transactions").delete().eq("id", id).select());
}

export async function upsertBudget(
  sb: SupabaseClient,
  input: { category_id: string; month: string; planned_cents: number },
) {
  const user = unwrap(await sb.auth.getUser()).user;
  unwrap(
    await sb
      .from("budgets")
      .upsert(
        { ...input, user_id: user.id },
        { onConflict: "user_id,category_id,month" },
      )
      .select(),
  );
}

export async function addCategory(
  sb: SupabaseClient,
  input: { name: string; kind: Kind },
) {
  const user = unwrap(await sb.auth.getUser()).user;
  unwrap(
    await sb
      .from("categories")
      .insert({ ...input, user_id: user.id })
      .select(),
  );
}

export async function renameCategory(
  sb: SupabaseClient,
  id: string,
  name: string,
) {
  unwrap(await sb.from("categories").update({ name }).eq("id", id).select());
}

export async function setCategoryArchived(
  sb: SupabaseClient,
  id: string,
  archived: boolean,
) {
  unwrap(
    await sb.from("categories").update({ archived }).eq("id", id).select(),
  );
}

/** Copies the previous month's budget rows into `month`. Returns rows copied. */
export async function copyPlanFromPreviousMonth(
  sb: SupabaseClient,
  month: string,
) {
  const prev = unwrap(
    await sb
      .from("budgets")
      .select("category_id,planned_cents")
      .eq("month", previousMonth(month)),
  ) as Pick<Budget, "category_id" | "planned_cents">[];
  if (prev.length === 0) return 0;
  const user = unwrap(await sb.auth.getUser()).user;
  unwrap(
    await sb
      .from("budgets")
      .upsert(
        prev.map((b) => ({ ...b, month, user_id: user.id })),
        { onConflict: "user_id,category_id,month" },
      )
      .select(),
  );
  return prev.length;
}
```

- [ ] **Step 4: Export, verify, commit**

Add to `packages/core/src/index.ts`:

```ts
export * from "./data";
export * from "./insights";
```

Run: `pnpm --filter @matematica/core typecheck && pnpm --filter @matematica/core test`
Expected: both PASS.

```bash
git add -A && git commit -m "feat(core): supabase data layer and insights SSE client"
```

### Task 7: Web app scaffold + auth

**Files:**

- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/vite.config.ts`, `apps/web/index.html`, `apps/web/src/main.tsx`, `apps/web/src/App.tsx`, `apps/web/src/index.css`, `apps/web/src/lib/supabase.ts`, `apps/web/src/screens/AuthScreen.tsx`, `apps/web/.env.example`

**Interfaces:**

- Consumes: tokens from core.
- Produces: `useSession()`-style auth gate in `App.tsx`; `sb` singleton from `lib/supabase.ts` — used by Tasks 8–9.

- [ ] **Step 1: Write app config**

`apps/web/package.json`:

```json
{
  "name": "web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@matematica/core": "workspace:*",
    "@supabase/supabase-js": "^2.49.0",
    "motion": "^12.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^5.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

`apps/web/vite.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({ plugins: [react(), tailwindcss()] });
```

`apps/web/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "noEmit": true
  },
  "include": ["src"]
}
```

`apps/web/index.html`:

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>matematica</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link
      href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=DM+Sans:wght@400;500;700&family=Space+Mono&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`apps/web/src/index.css`:

```css
@import "tailwindcss";
```

`apps/web/.env.example`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_AI_API_URL=http://localhost:8000
```

- [ ] **Step 2: Write supabase client + auth gate**

`apps/web/src/lib/supabase.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

export const sb = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
```

`apps/web/src/screens/AuthScreen.tsx`:

```tsx
import { color, font, radius, space } from "@matematica/core";
import { useState } from "react";
import { sb } from "../lib/supabase";

export function AuthScreen() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | string>("idle");

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await sb.auth.signInWithOtp({ email });
    setStatus(error ? error.message : "sent");
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center"
      style={{
        background: color.screen,
        fontFamily: font.body,
        color: color.text,
      }}
    >
      <form
        onSubmit={sendLink}
        className="flex w-80 flex-col"
        style={{
          gap: space.md,
          background: color.card,
          borderRadius: radius.card,
          padding: space.lg,
        }}
      >
        <h1 style={{ fontFamily: font.display, fontSize: 24 }}>matematica</h1>
        {status === "sent" ? (
          <p style={{ color: color.textSecondary }}>
            Link enviado. Confira seu e-mail.
          </p>
        ) : (
          <>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full"
              style={{
                background: color.cardAlt,
                borderRadius: radius.control,
                padding: `${space.sm}px ${space.md}px`,
                border: `1px solid ${color.hairline}`,
              }}
            />
            <button
              type="submit"
              style={{
                background: color.brand,
                color: color.screen,
                borderRadius: radius.control,
                padding: space.sm,
                fontWeight: 700,
              }}
            >
              Entrar
            </button>
            {status !== "idle" && (
              <p style={{ color: color.expense }}>{status}</p>
            )}
          </>
        )}
      </form>
    </main>
  );
}
```

`apps/web/src/App.tsx`:

```tsx
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { sb } from "./lib/supabase";
import { AuthScreen } from "./screens/AuthScreen";
import { MonthScreen } from "./screens/MonthScreen";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) return null;
  return session ? <MonthScreen session={session} /> : <AuthScreen />;
}
```

`apps/web/src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

Note: `MonthScreen` arrives in Task 8 — create a placeholder now so the build passes:

`apps/web/src/screens/MonthScreen.tsx` (placeholder, replaced in Task 8):

```tsx
import type { Session } from "@supabase/supabase-js";

export function MonthScreen(_props: { session: Session }) {
  return null;
}
```

- [ ] **Step 3: Verify and commit**

Run: `pnpm install && pnpm --filter web build`
Expected: build succeeds.

```bash
git add -A && git commit -m "feat(web): vite scaffold with magic-link auth"
```

### Task 8: Web month screen

**Files:**

- Modify: `apps/web/src/screens/MonthScreen.tsx` (replace placeholder)
- Create: `apps/web/src/components/SummaryTable.tsx`, `apps/web/src/components/Ledger.tsx`, `apps/web/src/components/QuickAdd.tsx`, `apps/web/src/components/CategoryManager.tsx`

**Interfaces:**

- Consumes: core `fetchMonthData`, `summarizeMonth`, `formatBRL`, `parseAmountToCents`, `addTransaction`, `deleteTransaction`, `upsertBudget`, `copyPlanFromPreviousMonth`, `addCategory`, `renameCategory`, `setCategoryArchived`, month utils, tokens, `motionTokens`; `sb` from Task 7.
- Produces: `MonthScreen({ session })` — already wired into `App.tsx`.

- [ ] **Step 1: Implement MonthScreen container**

`apps/web/src/screens/MonthScreen.tsx`:

```tsx
import {
  addMonths,
  color,
  copyPlanFromPreviousMonth,
  currentMonth,
  fetchMonthData,
  font,
  motionTokens,
  space,
  summarizeMonth,
  type Budget,
  type Category,
  type Transaction,
} from "@matematica/core";
import type { Session } from "@supabase/supabase-js";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { CategoryManager } from "../components/CategoryManager";
import { ChatPanel } from "../components/ChatPanel";
import { Ledger } from "../components/Ledger";
import { QuickAdd } from "../components/QuickAdd";
import { SummaryTable } from "../components/SummaryTable";
import { sb } from "../lib/supabase";

interface MonthData {
  categories: Category[];
  budgets: Budget[];
  transactions: Transaction[];
}

export function MonthScreen({ session }: { session: Session }) {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<MonthData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    fetchMonthData(sb, month).then(setData, (e: Error) => setError(e.message));
  }, [month]);

  useEffect(() => {
    setData(null);
    setError(null);
    reload();
  }, [reload]);

  const summary = data
    ? summarizeMonth(data.categories, data.budgets, data.transactions)
    : null;
  const emptyPlan = data !== null && data.budgets.length === 0;

  async function copyPlan() {
    try {
      await copyPlanFromPreviousMonth(sb, month);
      reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const monthLabel = new Date(`${month}-15`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <main
      className="min-h-screen"
      style={{
        background: color.screen,
        color: color.text,
        fontFamily: font.body,
      }}
    >
      <div
        className="mx-auto flex max-w-3xl flex-col"
        style={{ gap: space.lg, padding: space.lg }}
      >
        <header className="flex items-center justify-between">
          <div className="flex items-center" style={{ gap: space.md }}>
            <button
              aria-label="Mês anterior"
              onClick={() => setMonth((m) => addMonths(m, -1))}
            >
              ←
            </button>
            <h1
              style={{
                fontFamily: font.display,
                fontSize: 22,
                textTransform: "capitalize",
              }}
            >
              {monthLabel}
            </h1>
            <button
              aria-label="Próximo mês"
              onClick={() => setMonth((m) => addMonths(m, 1))}
            >
              →
            </button>
          </div>
          <button
            style={{ color: color.textMuted }}
            onClick={() => sb.auth.signOut()}
          >
            sair
          </button>
        </header>

        {error && <p style={{ color: color.expense }}>{error}</p>}

        <AnimatePresence mode="wait">
          {data && summary && (
            <motion.div
              key={month}
              className="flex flex-col"
              style={{ gap: space.lg }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{
                duration: motionTokens.duration.base,
                ease: motionTokens.ease,
              }}
            >
              {emptyPlan && (
                <button
                  onClick={copyPlan}
                  style={{
                    background: color.brandSoft,
                    color: color.brand,
                    borderRadius: 10,
                    padding: space.sm,
                    fontWeight: 500,
                  }}
                >
                  Copiar plano do mês anterior
                </button>
              )}
              <SummaryTable
                summary={summary}
                month={month}
                onChanged={reload}
              />
              <QuickAdd
                categories={data.categories}
                month={month}
                onAdded={reload}
              />
              <Ledger
                transactions={data.transactions}
                categories={data.categories}
                onChanged={reload}
              />
              <CategoryManager
                categories={data.categories}
                onChanged={reload}
              />
              <ChatPanel month={month} session={session} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Implement SummaryTable (planned editable inline)**

`apps/web/src/components/SummaryTable.tsx`:

```tsx
import {
  color,
  font,
  formatBRL,
  parseAmountToCents,
  radius,
  space,
  upsertBudget,
  type MonthSummary,
} from "@matematica/core";
import { useState } from "react";
import { sb } from "../lib/supabase";

function DiffCell({ cents }: { cents: number }) {
  const tone =
    cents === 0 ? color.textMuted : cents > 0 ? color.income : color.expense;
  return (
    <td className="text-right" style={{ color: tone, fontFamily: font.mono }}>
      {cents > 0 ? "+" : ""}
      {formatBRL(cents)}
    </td>
  );
}

export function SummaryTable({
  summary,
  month,
  onChanged,
}: {
  summary: MonthSummary;
  month: string;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function savePlanned(categoryId: string) {
    const cents = parseAmountToCents(draft);
    if (cents === null) {
      setError("Valor inválido");
      return;
    }
    try {
      await upsertBudget(sb, {
        category_id: categoryId,
        month,
        planned_cents: cents,
      });
      setEditing(null);
      setError(null);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <section
      style={{
        background: color.card,
        borderRadius: radius.card,
        padding: space.md,
      }}
    >
      <table className="w-full" style={{ fontSize: 14 }}>
        <thead>
          <tr style={{ color: color.textMuted, textAlign: "right" }}>
            <th className="text-left" style={{ fontWeight: 500 }}>
              Categoria
            </th>
            <th style={{ fontWeight: 500 }}>Planejado</th>
            <th style={{ fontWeight: 500 }}>Real</th>
            <th style={{ fontWeight: 500 }}>Dif.</th>
          </tr>
        </thead>
        <tbody>
          {summary.rows.map((row) => (
            <tr
              key={row.category.id}
              style={{ borderTop: `1px solid ${color.hairline}` }}
            >
              <td style={{ padding: `${space.sm}px 0` }}>
                {row.category.name}
                {row.category.kind === "income" && (
                  <span
                    style={{
                      color: color.income,
                      marginLeft: space.sm,
                      fontSize: 11,
                    }}
                  >
                    renda
                  </span>
                )}
              </td>
              <td
                className="cursor-pointer text-right"
                style={{ fontFamily: font.mono }}
                onClick={() => {
                  setEditing(row.category.id);
                  setDraft(
                    (row.plannedCents / 100).toFixed(2).replace(".", ","),
                  );
                }}
              >
                {editing === row.category.id ? (
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => savePlanned(row.category.id)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && savePlanned(row.category.id)
                    }
                    className="w-24 text-right"
                    style={{
                      background: color.cardAlt,
                      borderRadius: 6,
                      fontFamily: font.mono,
                    }}
                  />
                ) : (
                  formatBRL(row.plannedCents)
                )}
              </td>
              <td className="text-right" style={{ fontFamily: font.mono }}>
                {formatBRL(row.actualCents)}
              </td>
              <DiffCell cents={row.diffCents} />
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr
            style={{
              borderTop: `1px solid ${color.hairline}`,
              fontWeight: 700,
            }}
          >
            <td style={{ padding: `${space.sm}px 0` }}>Saldo do mês</td>
            <td />
            <td />
            <td
              className="text-right"
              style={{
                fontFamily: font.mono,
                color:
                  summary.remainingCents >= 0 ? color.income : color.expense,
              }}
            >
              {formatBRL(summary.remainingCents)}
            </td>
          </tr>
        </tfoot>
      </table>
      {error && (
        <p style={{ color: color.expense, marginTop: space.sm }}>{error}</p>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Implement QuickAdd, Ledger, CategoryManager**

`apps/web/src/components/QuickAdd.tsx`:

```tsx
import {
  addTransaction,
  color,
  parseAmountToCents,
  radius,
  space,
  type Category,
} from "@matematica/core";
import { useState } from "react";
import { sb } from "../lib/supabase";

export function QuickAdd({
  categories,
  month,
  onAdded,
}: {
  categories: Category[];
  month: string;
  onAdded: () => void;
}) {
  const active = categories.filter((c) => !c.archived);
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(
    today.startsWith(month) ? today : `${month}-01`,
  );
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cents = parseAmountToCents(amount);
    if (cents === null || cents === 0) return setError("Valor inválido");
    if (!categoryId) return setError("Escolha uma categoria");
    try {
      await addTransaction(sb, {
        category_id: categoryId,
        date,
        amount_cents: cents,
        description,
      });
      setAmount("");
      setDescription("");
      setError(null);
      onAdded();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const field = {
    background: color.cardAlt,
    borderRadius: radius.control,
    padding: `${space.sm}px ${space.md}px`,
    border: `1px solid ${color.hairline}`,
  } as const;

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-center"
      style={{
        gap: space.sm,
        background: color.card,
        borderRadius: radius.card,
        padding: space.md,
      }}
    >
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
        style={field}
      />
      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        required
        style={field}
      >
        <option value="">categoria…</option>
        {active.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <input
        placeholder="valor"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        className="w-24"
        style={field}
      />
      <input
        placeholder="descrição"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="flex-1"
        style={field}
      />
      <button
        type="submit"
        style={{
          background: color.brand,
          color: color.screen,
          borderRadius: radius.control,
          padding: `${space.sm}px ${space.md}px`,
          fontWeight: 700,
        }}
      >
        +
      </button>
      {error && (
        <p className="w-full" style={{ color: color.expense }}>
          {error}
        </p>
      )}
    </form>
  );
}
```

`apps/web/src/components/Ledger.tsx`:

```tsx
import {
  color,
  deleteTransaction,
  font,
  formatBRL,
  motionTokens,
  radius,
  space,
  type Category,
  type Transaction,
} from "@matematica/core";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { sb } from "../lib/supabase";

export function Ledger({
  transactions,
  categories,
  onChanged,
}: {
  transactions: Transaction[];
  categories: Category[];
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const byId = new Map(categories.map((c) => [c.id, c]));

  async function remove(id: string) {
    try {
      await deleteTransaction(sb, id);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (transactions.length === 0) {
    return (
      <p style={{ color: color.textMuted }}>Nenhum lançamento neste mês.</p>
    );
  }

  return (
    <section
      style={{
        background: color.card,
        borderRadius: radius.card,
        padding: space.md,
      }}
    >
      {error && <p style={{ color: color.expense }}>{error}</p>}
      <ul>
        <AnimatePresence initial={false}>
          {transactions.map((t) => {
            const cat = byId.get(t.category_id);
            const isIncome = cat?.kind === "income";
            return (
              <motion.li
                key={t.id}
                className="group flex items-center justify-between"
                style={{
                  padding: `${space.sm}px 0`,
                  borderTop: `1px solid ${color.hairline}`,
                }}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{
                  duration: motionTokens.duration.fast,
                  ease: motionTokens.ease,
                }}
              >
                <span
                  style={{
                    color: color.textMuted,
                    fontFamily: font.mono,
                    fontSize: 12,
                  }}
                >
                  {t.date.slice(8, 10)}/{t.date.slice(5, 7)}
                </span>
                <span className="flex-1" style={{ marginLeft: space.md }}>
                  {t.description || cat?.name || "—"}
                  <span
                    style={{
                      color: color.textMuted,
                      marginLeft: space.sm,
                      fontSize: 12,
                    }}
                  >
                    {cat?.name}
                  </span>
                </span>
                <span
                  style={{
                    fontFamily: font.mono,
                    color: isIncome ? color.income : color.text,
                  }}
                >
                  {isIncome ? "+" : "−"}
                  {formatBRL(t.amount_cents)}
                </span>
                <button
                  aria-label="Excluir"
                  onClick={() => remove(t.id)}
                  className="opacity-0 group-hover:opacity-100"
                  style={{ color: color.expense, marginLeft: space.md }}
                >
                  ×
                </button>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </section>
  );
}
```

`apps/web/src/components/CategoryManager.tsx`:

```tsx
import {
  addCategory,
  color,
  radius,
  renameCategory,
  setCategoryArchived,
  space,
  type Category,
  type Kind,
} from "@matematica/core";
import { useState } from "react";
import { sb } from "../lib/supabase";

export function CategoryManager({
  categories,
  onChanged,
}: {
  categories: Category[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("expense");
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    try {
      await action();
      setError(null);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!open) {
    return (
      <button
        className="self-start"
        style={{ color: color.textMuted }}
        onClick={() => setOpen(true)}
      >
        gerenciar categorias
      </button>
    );
  }

  return (
    <section
      style={{
        background: color.card,
        borderRadius: radius.card,
        padding: space.md,
      }}
    >
      <div className="flex items-center justify-between">
        <h2 style={{ fontWeight: 700 }}>Categorias</h2>
        <button
          style={{ color: color.textMuted }}
          onClick={() => setOpen(false)}
        >
          fechar
        </button>
      </div>
      {error && <p style={{ color: color.expense }}>{error}</p>}
      <ul style={{ marginTop: space.sm }}>
        {categories.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between"
            style={{ padding: `${space.xs}px 0` }}
          >
            <input
              defaultValue={c.name}
              onBlur={(e) =>
                e.target.value !== c.name &&
                run(() => renameCategory(sb, c.id, e.target.value))
              }
              style={{
                background: "transparent",
                opacity: c.archived ? 0.4 : 1,
              }}
            />
            <span style={{ color: color.textMuted, fontSize: 12 }}>
              {c.kind === "income" ? "renda" : "despesa"}
            </span>
            <button
              style={{ color: color.textMuted, marginLeft: space.md }}
              onClick={() =>
                run(() => setCategoryArchived(sb, c.id, !c.archived))
              }
            >
              {c.archived ? "restaurar" : "arquivar"}
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex items-center"
        style={{ gap: space.sm, marginTop: space.sm }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          run(() => addCategory(sb, { name: name.trim(), kind })).then(() =>
            setName(""),
          );
        }}
      >
        <input
          placeholder="nova categoria"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            background: color.cardAlt,
            borderRadius: radius.control,
            padding: `${space.xs}px ${space.sm}px`,
          }}
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as Kind)}
          style={{
            background: color.cardAlt,
            borderRadius: radius.control,
            padding: space.xs,
          }}
        >
          <option value="expense">despesa</option>
          <option value="income">renda</option>
        </select>
        <button type="submit" style={{ color: color.brand, fontWeight: 700 }}>
          adicionar
        </button>
      </form>
    </section>
  );
}
```

- [ ] **Step 4: Verify and commit**

Run: `pnpm --filter web build` — Expected: fails only on missing `ChatPanel` → create the Task 9 placeholder now:

`apps/web/src/components/ChatPanel.tsx` (placeholder, replaced in Task 9):

```tsx
import type { Session } from "@supabase/supabase-js";

export function ChatPanel(_props: { month: string; session: Session }) {
  return null;
}
```

Run again: `pnpm --filter web build` — Expected: succeeds.

```bash
git add -A && git commit -m "feat(web): month screen with summary, ledger, quick add, categories"
```

### Task 9: Web chat panel

**Files:**

- Modify: `apps/web/src/components/ChatPanel.tsx` (replace placeholder)

**Interfaces:**

- Consumes: `streamInsights`, `ChatMessage` from core; `session.access_token`; env `VITE_AI_API_URL`.

- [ ] **Step 1: Implement ChatPanel**

```tsx
import {
  color,
  font,
  motionTokens,
  radius,
  space,
  streamInsights,
  type ChatMessage,
} from "@matematica/core";
import type { Session } from "@supabase/supabase-js";
import { motion } from "motion/react";
import { useState } from "react";

export function ChatPanel({
  month,
  session,
}: {
  month: string;
  session: Session;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || busy) return;
    const history: ChatMessage[] = [
      ...messages,
      { role: "user", text: question },
    ];
    setMessages([...history, { role: "assistant", text: "" }]);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      let reply = "";
      for await (const chunk of streamInsights({
        apiUrl: import.meta.env.VITE_AI_API_URL,
        accessToken: session.access_token,
        month,
        messages: history,
      })) {
        reply += chunk;
        setMessages([...history, { role: "assistant", text: reply }]);
      }
    } catch (err) {
      setMessages(history);
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      style={{
        background: color.card,
        borderRadius: radius.card,
        padding: space.md,
      }}
    >
      <h2
        style={{
          fontFamily: font.display,
          fontSize: 16,
          marginBottom: space.sm,
        }}
      >
        Assistente do mês
      </h2>
      <div className="flex flex-col" style={{ gap: space.sm }}>
        {messages.map((m, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: motionTokens.duration.fast }}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              background: m.role === "user" ? color.brandSoft : color.cardAlt,
              color: m.role === "user" ? color.brand : color.text,
              borderRadius: radius.control,
              padding: `${space.sm}px ${space.md}px`,
              maxWidth: "85%",
              whiteSpace: "pre-wrap",
            }}
          >
            {m.text || "…"}
          </motion.p>
        ))}
      </div>
      {error && (
        <p style={{ color: color.expense, marginTop: space.sm }}>{error}</p>
      )}
      <form
        onSubmit={send}
        className="flex"
        style={{ gap: space.sm, marginTop: space.md }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte sobre este mês…"
          className="flex-1"
          style={{
            background: color.cardAlt,
            borderRadius: radius.control,
            padding: `${space.sm}px ${space.md}px`,
            border: `1px solid ${color.hairline}`,
          }}
        />
        <button
          disabled={busy}
          style={{
            background: color.brand,
            color: color.screen,
            borderRadius: radius.control,
            padding: `${space.sm}px ${space.md}px`,
            fontWeight: 700,
            opacity: busy ? 0.5 : 1,
          }}
        >
          →
        </button>
      </form>
    </section>
  );
}
```

- [ ] **Step 2: Verify and commit**

Run: `pnpm --filter web build && pnpm --filter web typecheck` — Expected: both succeed.

```bash
git add -A && git commit -m "feat(web): streaming AI insights chat panel"
```

### Task 10: Mobile app

**Files:**

- Create: `apps/mobile/package.json`, `apps/mobile/tsconfig.json`, `apps/mobile/app.json`, `apps/mobile/babel.config.js`, `apps/mobile/app/_layout.tsx`, `apps/mobile/app/index.tsx`, `apps/mobile/lib/supabase.ts`, `apps/mobile/.env.example`

**Interfaces:**

- Consumes: everything core exports; env `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_AI_API_URL`.

- [ ] **Step 1: Scaffold with create-expo-app**

Run from repo root:

```bash
pnpm create expo-app@latest apps/mobile --template default --no-install
```

Then edit `apps/mobile/package.json`: set `"name": "mobile"`, add
`"@matematica/core": "workspace:*"` and `"@supabase/supabase-js": "^2.49.0"`
to dependencies, add `"typecheck": "tsc --noEmit"` to scripts. Delete the
template's example screens/components (keep `app/`, assets, config). Run
`pnpm install`.

- [ ] **Step 2: Write supabase client**

`apps/mobile/lib/supabase.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

export const sb = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
);
```

`apps/mobile/.env.example`:

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_AI_API_URL=http://localhost:8000
```

- [ ] **Step 3: Write layout with auth gate**

`apps/mobile/app/_layout.tsx`:

```tsx
import { color } from "@matematica/core";
import type { Session } from "@supabase/supabase-js";
import { Stack } from "expo-router";
import { createContext, useContext, useEffect, useState } from "react";
import { Button, Text, TextInput, View } from "react-native";
import { sb } from "../lib/supabase";

const SessionContext = createContext<Session | null>(null);
export const useSession = () => useContext(SessionContext);

function AuthScreen() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | string>("idle");

  async function sendLink() {
    const { error } = await sb.auth.signInWithOtp({ email });
    setStatus(error ? error.message : "sent");
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        padding: 24,
        backgroundColor: color.screen,
      }}
    >
      <Text style={{ color: color.text, fontSize: 24, marginBottom: 16 }}>
        matematica
      </Text>
      {status === "sent" ? (
        <Text style={{ color: color.textSecondary }}>
          Link enviado. Confira seu e-mail.
        </Text>
      ) : (
        <>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            placeholderTextColor={color.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            style={{
              color: color.text,
              backgroundColor: color.card,
              borderRadius: 10,
              padding: 12,
              marginBottom: 12,
            }}
          />
          <Button title="Entrar" color={color.brand} onPress={sendLink} />
          {status !== "idle" && (
            <Text style={{ color: color.expense }}>{status}</Text>
          )}
        </>
      )}
    </View>
  );
}

export default function Layout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) return null;
  if (!session) return <AuthScreen />;
  return (
    <SessionContext.Provider value={session}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.screen },
        }}
      />
    </SessionContext.Provider>
  );
}
```

- [ ] **Step 4: Write month screen**

`apps/mobile/app/index.tsx` — same flow as web, RN primitives. Summary rows,
ledger with delete, quick add, copy-plan button, chat at the bottom of a
ScrollView:

```tsx
import {
  addMonths,
  addTransaction,
  color,
  copyPlanFromPreviousMonth,
  currentMonth,
  deleteTransaction,
  fetchMonthData,
  font,
  formatBRL,
  parseAmountToCents,
  streamInsights,
  summarizeMonth,
  type Budget,
  type Category,
  type ChatMessage,
  type Transaction,
} from "@matematica/core";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { sb } from "../lib/supabase";
import { useSession } from "./_layout";

interface MonthData {
  categories: Category[];
  budgets: Budget[];
  transactions: Transaction[];
}

const row = { flexDirection: "row", alignItems: "center" } as const;
const mono = {
  fontFamily: font.mono.includes("Space") ? "Courier" : undefined,
} as const; // ponytail: custom fonts via expo-font later

export default function MonthScreen() {
  const session = useSession();
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<MonthData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    fetchMonthData(sb, month).then(setData, (e: Error) => setError(e.message));
  }, [month]);

  useEffect(() => {
    setData(null);
    reload();
  }, [reload]);

  const summary = data
    ? summarizeMonth(data.categories, data.budgets, data.transactions)
    : null;
  const active = data?.categories.filter((c) => !c.archived) ?? [];

  async function guard(action: () => Promise<unknown>) {
    try {
      await action();
      setError(null);
      reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function addTx() {
    const cents = parseAmountToCents(amount);
    if (cents === null || cents === 0 || !categoryId)
      return setError("Valor ou categoria inválidos");
    const today = new Date().toISOString().slice(0, 10);
    guard(() =>
      addTransaction(sb, {
        category_id: categoryId,
        date: today.startsWith(month) ? today : `${month}-01`,
        amount_cents: cents,
        description,
      }),
    ).then(() => {
      setAmount("");
      setDescription("");
    });
  }

  async function sendChat() {
    const question = chatInput.trim();
    if (!question || busy || !session) return;
    const history: ChatMessage[] = [...chat, { role: "user", text: question }];
    setChat([...history, { role: "assistant", text: "…" }]);
    setChatInput("");
    setBusy(true);
    try {
      let reply = "";
      for await (const chunk of streamInsights({
        apiUrl: process.env.EXPO_PUBLIC_AI_API_URL!,
        accessToken: session.access_token,
        month,
        messages: history,
      })) {
        reply += chunk;
        setChat([...history, { role: "assistant", text: reply }]);
      }
    } catch (e) {
      setChat(history);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const monthLabel = new Date(`${month}-15`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.screen }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      <View style={[row, { justifyContent: "space-between", marginTop: 40 }]}>
        <Pressable onPress={() => setMonth((m) => addMonths(m, -1))}>
          <Text style={{ color: color.text, fontSize: 22 }}>←</Text>
        </Pressable>
        <Text
          style={{
            color: color.text,
            fontSize: 20,
            textTransform: "capitalize",
          }}
        >
          {monthLabel}
        </Text>
        <Pressable onPress={() => setMonth((m) => addMonths(m, 1))}>
          <Text style={{ color: color.text, fontSize: 22 }}>→</Text>
        </Pressable>
      </View>

      {error && <Text style={{ color: color.expense }}>{error}</Text>}

      {data && summary && (
        <>
          {data.budgets.length === 0 && (
            <Pressable
              onPress={() => guard(() => copyPlanFromPreviousMonth(sb, month))}
              style={{
                backgroundColor: color.brandSoft,
                borderRadius: 10,
                padding: 12,
              }}
            >
              <Text style={{ color: color.brand, textAlign: "center" }}>
                Copiar plano do mês anterior
              </Text>
            </Pressable>
          )}

          <View
            style={{
              backgroundColor: color.card,
              borderRadius: 16,
              padding: 16,
              gap: 8,
            }}
          >
            {summary.rows.map((r) => (
              <View
                key={r.category.id}
                style={[row, { justifyContent: "space-between" }]}
              >
                <Text style={{ color: color.text, flex: 1 }}>
                  {r.category.name}
                </Text>
                <Text
                  style={[
                    mono,
                    { color: color.textSecondary, marginRight: 12 },
                  ]}
                >
                  {formatBRL(r.actualCents)} / {formatBRL(r.plannedCents)}
                </Text>
                <Text
                  style={[
                    mono,
                    {
                      color:
                        r.diffCents === 0
                          ? color.textMuted
                          : r.diffCents > 0
                            ? color.income
                            : color.expense,
                    },
                  ]}
                >
                  {r.diffCents > 0 ? "+" : ""}
                  {formatBRL(r.diffCents)}
                </Text>
              </View>
            ))}
            <View
              style={[
                row,
                {
                  justifyContent: "space-between",
                  borderTopWidth: 1,
                  borderTopColor: color.hairline,
                  paddingTop: 8,
                },
              ]}
            >
              <Text style={{ color: color.text, fontWeight: "700" }}>
                Saldo do mês
              </Text>
              <Text
                style={[
                  mono,
                  {
                    color:
                      summary.remainingCents >= 0
                        ? color.income
                        : color.expense,
                    fontWeight: "700",
                  },
                ]}
              >
                {formatBRL(summary.remainingCents)}
              </Text>
            </View>
          </View>

          <View
            style={{
              backgroundColor: color.card,
              borderRadius: 16,
              padding: 16,
              gap: 8,
            }}
          >
            <View style={[row, { gap: 8, flexWrap: "wrap" }]}>
              {active.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => setCategoryId(c.id)}
                  style={{
                    backgroundColor:
                      categoryId === c.id ? color.brandSoft : color.cardAlt,
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{
                      color:
                        categoryId === c.id ? color.brand : color.textSecondary,
                    }}
                  >
                    {c.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="valor"
              placeholderTextColor={color.textMuted}
              keyboardType="decimal-pad"
              style={{
                color: color.text,
                backgroundColor: color.cardAlt,
                borderRadius: 10,
                padding: 10,
              }}
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="descrição"
              placeholderTextColor={color.textMuted}
              style={{
                color: color.text,
                backgroundColor: color.cardAlt,
                borderRadius: 10,
                padding: 10,
              }}
            />
            <Pressable
              onPress={addTx}
              style={{
                backgroundColor: color.brand,
                borderRadius: 10,
                padding: 12,
              }}
            >
              <Text
                style={{
                  color: color.screen,
                  textAlign: "center",
                  fontWeight: "700",
                }}
              >
                Adicionar
              </Text>
            </Pressable>
          </View>

          <View
            style={{
              backgroundColor: color.card,
              borderRadius: 16,
              padding: 16,
            }}
          >
            {data.transactions.length === 0 && (
              <Text style={{ color: color.textMuted }}>
                Nenhum lançamento neste mês.
              </Text>
            )}
            {data.transactions.map((t) => {
              const cat = data.categories.find((c) => c.id === t.category_id);
              return (
                <View
                  key={t.id}
                  style={[
                    row,
                    { justifyContent: "space-between", paddingVertical: 6 },
                  ]}
                >
                  <Text
                    style={[mono, { color: color.textMuted, fontSize: 12 }]}
                  >
                    {t.date.slice(8, 10)}/{t.date.slice(5, 7)}
                  </Text>
                  <Text
                    style={{ color: color.text, flex: 1, marginLeft: 12 }}
                    numberOfLines={1}
                  >
                    {t.description || cat?.name || "—"}
                  </Text>
                  <Text
                    style={[
                      mono,
                      {
                        color:
                          cat?.kind === "income" ? color.income : color.text,
                      },
                    ]}
                  >
                    {cat?.kind === "income" ? "+" : "−"}
                    {formatBRL(t.amount_cents)}
                  </Text>
                  <Pressable
                    onPress={() => guard(() => deleteTransaction(sb, t.id))}
                  >
                    <Text style={{ color: color.expense, marginLeft: 12 }}>
                      ×
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          <View
            style={{
              backgroundColor: color.card,
              borderRadius: 16,
              padding: 16,
              gap: 8,
            }}
          >
            <Text style={{ color: color.text, fontWeight: "700" }}>
              Assistente do mês
            </Text>
            {chat.map((m, i) => (
              <Text
                key={i}
                style={{
                  color: m.role === "user" ? color.brand : color.text,
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                {m.text}
              </Text>
            ))}
            <View style={[row, { gap: 8 }]}>
              <TextInput
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Pergunte sobre este mês…"
                placeholderTextColor={color.textMuted}
                style={{
                  flex: 1,
                  color: color.text,
                  backgroundColor: color.cardAlt,
                  borderRadius: 10,
                  padding: 10,
                }}
              />
              <Pressable
                onPress={sendChat}
                disabled={busy}
                style={{
                  backgroundColor: color.brand,
                  borderRadius: 10,
                  padding: 10,
                  opacity: busy ? 0.5 : 1,
                }}
              >
                <Text style={{ color: color.screen, fontWeight: "700" }}>
                  →
                </Text>
              </Pressable>
            </View>
          </View>
        </>
      )}
      <Pressable onPress={() => sb.auth.signOut()}>
        <Text
          style={{
            color: color.textMuted,
            textAlign: "center",
            marginBottom: 40,
          }}
        >
          sair
        </Text>
      </Pressable>
    </ScrollView>
  );
}
```

Note: mobile v1 omits inline planned-editing and category management —
those live on web; mobile is capture + glance. Reanimated ships with the
Expo template for future motion parity; layout animations can be added
when a screen needs them.

- [ ] **Step 5: Verify and commit**

Run: `pnpm install && pnpm --filter mobile typecheck` — Expected: exits 0.

```bash
git add -A && git commit -m "feat(mobile): expo app with month screen and chat"
```

### Task 11: Root verify + README

**Files:**

- Create: `README.md`
- Modify: root `package.json` only if a script proved wrong during Tasks 1–10.

- [ ] **Step 1: Write README**

`README.md`:

```markdown
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
```

- [ ] **Step 2: Run full verify**

Run: `pnpm verify`
Expected: all steps pass. Fix anything that fails before committing.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "docs: README and verified workspace"
```

---

## Part B — matematica-ai-api (sibling repo at `../matematica-ai-api`)

### Task 12: Service scaffold

**Files:**

- Create: `pyproject.toml`, `.gitignore`, `.env.example`, `app/__init__.py`, `app/config.py`, `app/schemas.py`, `app/errors.py`, `app/main.py`, `tests/__init__.py`, `tests/test_health.py`

- [ ] **Step 1: Init repo and write config**

```bash
mkdir -p /Users/daltoncastro/Documents/Projects/matematica-ai-api/app /Users/daltoncastro/Documents/Projects/matematica-ai-api/tests
cd /Users/daltoncastro/Documents/Projects/matematica-ai-api && git init -b main
```

`pyproject.toml`:

```toml
[build-system]
requires = ["setuptools==83.0.0"]
build-backend = "setuptools.build_meta"

[project]
name = "matematica-ai-api"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi==0.139.0",
    "uvicorn[standard]==0.51.0",
    "pydantic==2.13.4",
    "pydantic-settings==2.14.2",
    "httpx==0.28.1",
]

[project.optional-dependencies]
dev = [
    "pytest==9.1.1",
    "pytest-asyncio==1.4.0",
    "ruff==0.15.21",
]

[tool.pytest.ini_options]
asyncio_mode = "auto"

[tool.ruff]
target-version = "py311"

[tool.setuptools]
packages = ["app"]
```

`.gitignore`:

```
__pycache__/
.venv/
.env
.pytest_cache/
.ruff_cache/
```

`.env.example`:

```
GEMINI_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
CORS_ORIGINS=http://localhost:5173
```

`app/config.py`:

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gemini_api_key: str
    supabase_url: str
    supabase_anon_key: str
    cors_origins: str = "http://localhost:5173"

    model_config = {"env_file": ".env"}


def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]  # loaded from env
```

`app/schemas.py`:

```python
from typing import Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    text: str


class ChatRequest(BaseModel):
    month: str = Field(pattern=r"^\d{4}-\d{2}$")
    messages: list[ChatMessage] = Field(min_length=1)
```

`app/errors.py`:

```python
class UpstreamError(Exception):
    """Gemini or Supabase failed; details are logged, clients get a generic message."""

    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


class RateLimitedError(UpstreamError):
    def __init__(self) -> None:
        super().__init__(429, "Assistente ocupado. Tente novamente em instantes.")
```

`app/main.py`:

```python
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.errors import UpstreamError

logger = logging.getLogger("matematica-ai-api")

app = FastAPI(title="matematica-ai-api")
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins.split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(UpstreamError)
async def upstream_error_handler(_request: Request, exc: UpstreamError) -> JSONResponse:
    logger.error("upstream error %s: %s", exc.status_code, exc.detail)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
```

`tests/test_health.py`:

```python
from fastapi.testclient import TestClient

from app.main import app


def test_health() -> None:
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 2: Verify**

```bash
cd /Users/daltoncastro/Documents/Projects/matematica-ai-api
python3 -m venv .venv && .venv/bin/pip install -e '.[dev]'
GEMINI_API_KEY=x SUPABASE_URL=http://x SUPABASE_ANON_KEY=x .venv/bin/pytest -q
.venv/bin/ruff check .
```

Expected: 1 test passes; ruff clean.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chore: fastapi scaffold with health check"
```

### Task 13: Supabase auth + data fetch

**Files:**

- Create: `app/supabase.py`, `tests/test_supabase.py`

**Interfaces:**

- Produces: `async validate_token(token: str) -> str` (returns user id, raises `UpstreamError(401, ...)` on bad token); `async fetch_month_data(token: str, month: str) -> dict` with keys `categories`, `budgets`, `transactions`.

- [ ] **Step 1: Write failing tests (mock httpx)**

`tests/test_supabase.py`:

```python
import httpx
import pytest

from app.errors import UpstreamError
from app.supabase import fetch_month_data, validate_token


def _transport(handler):
    return httpx.MockTransport(handler)


async def test_validate_token_returns_user_id(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["authorization"] == "Bearer tok"
        return httpx.Response(200, json={"id": "user-1"})

    monkeypatch.setattr("app.supabase._client_transport", _transport(handler))
    assert await validate_token("tok") == "user-1"


async def test_validate_token_rejects_bad_token(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"message": "invalid"})

    monkeypatch.setattr("app.supabase._client_transport", _transport(handler))
    with pytest.raises(UpstreamError) as exc:
        await validate_token("bad")
    assert exc.value.status_code == 401


async def test_fetch_month_data_queries_three_tables(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["authorization"] == "Bearer tok"
        if "categories" in request.url.path:
            return httpx.Response(200, json=[{"id": "c1", "name": "food", "kind": "expense"}])
        if "budgets" in request.url.path:
            assert request.url.params["month"] == "eq.2026-07"
            return httpx.Response(200, json=[])
        assert request.url.params["date"] == "gte.2026-07-01"
        return httpx.Response(200, json=[])

    monkeypatch.setattr("app.supabase._client_transport", _transport(handler))
    data = await fetch_month_data("tok", "2026-07")
    assert data["categories"][0]["name"] == "food"
    assert data["budgets"] == []
    assert data["transactions"] == []
```

Run: `GEMINI_API_KEY=x SUPABASE_URL=http://x SUPABASE_ANON_KEY=x .venv/bin/pytest tests/test_supabase.py -q`
Expected: FAIL — `app.supabase` missing.

- [ ] **Step 2: Implement app/supabase.py**

```python
"""Supabase access using the caller's own token — RLS applies, no service key."""

from typing import Any

import httpx

from app.config import get_settings
from app.errors import UpstreamError

# Test seam: tests replace this with httpx.MockTransport.
_client_transport: httpx.AsyncBaseTransport | None = None


def _client() -> httpx.AsyncClient:
    settings = get_settings()
    return httpx.AsyncClient(
        base_url=settings.supabase_url,
        headers={"apikey": settings.supabase_anon_key},
        transport=_client_transport,
        timeout=15,
    )


async def validate_token(token: str) -> str:
    async with _client() as client:
        response = await client.get("/auth/v1/user", headers={"Authorization": f"Bearer {token}"})
    if response.status_code != 200:
        raise UpstreamError(401, "Token inválido ou expirado.")
    return response.json()["id"]


async def fetch_month_data(token: str, month: str) -> dict[str, Any]:
    auth = {"Authorization": f"Bearer {token}"}
    async with _client() as client:
        categories, budgets, transactions = [
            await client.get(url, params=params, headers=auth)
            for url, params in [
                ("/rest/v1/categories", {"select": "id,name,kind,archived"}),
                ("/rest/v1/budgets", {"select": "category_id,month,planned_cents", "month": f"eq.{month}"}),
                (
                    "/rest/v1/transactions",
                    {
                        "select": "category_id,date,amount_cents,description",
                        "date": f"gte.{month}-01",
                        "order": "date.desc",
                    },
                ),
            ]
        ]
    for response in (categories, budgets, transactions):
        if response.status_code != 200:
            raise UpstreamError(502, f"Supabase respondeu {response.status_code}.")
    transactions_rows = [t for t in transactions.json() if str(t["date"]).startswith(month)]
    return {
        "categories": categories.json(),
        "budgets": budgets.json(),
        "transactions": transactions_rows,
    }
```

Note: transactions are fetched from the month start and filtered by
month prefix in Python rather than computing the exclusive end date in
PostgREST syntax — one less date computation to get wrong; volumes are
tiny.

- [ ] **Step 3: Run tests, verify pass; lint; commit**

Run: `GEMINI_API_KEY=x SUPABASE_URL=http://x SUPABASE_ANON_KEY=x .venv/bin/pytest -q && .venv/bin/ruff check .`
Expected: all pass, ruff clean.

```bash
git add -A && git commit -m "feat: supabase token validation and month data fetch"
```

### Task 14: Context + prompts (TDD)

**Files:**

- Create: `app/context.py`, `app/prompts.py`, `tests/test_context.py`

**Interfaces:**

- Produces: `build_context(data: dict, month: str) -> str` (compact plain-text tables); `SYSTEM_PROMPT: str` in prompts.

- [ ] **Step 1: Write failing tests**

`tests/test_context.py`:

```python
from app.context import build_context

DATA = {
    "categories": [
        {"id": "c1", "name": "Mercado", "kind": "expense", "archived": False},
        {"id": "c2", "name": "Salário", "kind": "income", "archived": False},
    ],
    "budgets": [{"category_id": "c1", "month": "2026-07", "planned_cents": 90000}],
    "transactions": [
        {"category_id": "c1", "date": "2026-07-03", "amount_cents": 74200, "description": "feira"},
        {"category_id": "c2", "date": "2026-07-05", "amount_cents": 800000, "description": ""},
    ],
}


def test_context_contains_summary_and_ledger() -> None:
    ctx = build_context(DATA, "2026-07")
    assert "2026-07" in ctx
    assert "Mercado" in ctx and "900.00" in ctx and "742.00" in ctx
    assert "Salário" in ctx and "8000.00" in ctx
    assert "feira" in ctx


def test_context_handles_empty_month() -> None:
    ctx = build_context({"categories": [], "budgets": [], "transactions": []}, "2026-07")
    assert "sem lançamentos" in ctx.lower()
```

Run: `... .venv/bin/pytest tests/test_context.py -q` — Expected: FAIL.

- [ ] **Step 2: Implement**

`app/context.py`:

```python
"""Turn month data into a compact plain-text block for the model."""

from typing import Any


def _reais(cents: int) -> str:
    return f"{cents / 100:.2f}"


def build_context(data: dict[str, Any], month: str) -> str:
    categories = {c["id"]: c for c in data["categories"]}
    if not data["transactions"] and not data["budgets"]:
        return f"Mês {month}: sem lançamentos nem plano."

    planned: dict[str, int] = {}
    for b in data["budgets"]:
        planned[b["category_id"]] = planned.get(b["category_id"], 0) + b["planned_cents"]
    actual: dict[str, int] = {}
    for t in data["transactions"]:
        actual[t["category_id"]] = actual.get(t["category_id"], 0) + t["amount_cents"]

    lines = [f"Mês: {month}", "", "Resumo por categoria (planejado / real, em R$):"]
    for cat_id in sorted(set(planned) | set(actual), key=lambda i: categories.get(i, {}).get("name", "")):
        cat = categories.get(cat_id)
        if cat is None:
            continue
        kind = "renda" if cat["kind"] == "income" else "despesa"
        lines.append(
            f"- {cat['name']} ({kind}): {_reais(planned.get(cat_id, 0))} / {_reais(actual.get(cat_id, 0))}"
        )

    lines += ["", "Lançamentos:"]
    for t in data["transactions"]:
        name = categories.get(t["category_id"], {}).get("name", "?")
        desc = f" — {t['description']}" if t["description"] else ""
        lines.append(f"- {t['date']} {name}: {_reais(t['amount_cents'])}{desc}")
    return "\n".join(lines)
```

`app/prompts.py`:

```python
SYSTEM_PROMPT = """Você é o assistente financeiro do app matematica.
Responda em português, de forma direta e curta, sobre o mês do usuário
usando apenas os dados fornecidos abaixo. Valores estão em reais (R$).
Se os dados não respondem à pergunta, diga isso claramente.

{context}"""
```

- [ ] **Step 3: Run tests, verify pass, commit**

Run: `... .venv/bin/pytest -q` — Expected: PASS.

```bash
git add -A && git commit -m "feat: month context builder and system prompt"
```

### Task 15: Gemini streaming + chat endpoint

**Files:**

- Create: `app/gemini.py`, `app/service.py`, `tests/test_chat.py`
- Modify: `app/main.py` (add router/endpoint)

**Interfaces:**

- Consumes: `validate_token`, `fetch_month_data`, `build_context`, `SYSTEM_PROMPT`, `ChatRequest`.
- Produces: `POST /insights/chat` — SSE stream of `data: {"text": "..."}` events.

- [ ] **Step 1: Write failing endpoint test (mock supabase + gemini)**

`tests/test_chat.py`:

```python
from fastapi.testclient import TestClient

import app.main as main_module
from app.main import app


async def _fake_stream(system: str, messages):  # noqa: ANN001
    yield "Olá"
    yield " mundo"


def test_chat_streams_sse(monkeypatch):
    async def fake_validate(token: str) -> str:
        assert token == "tok"
        return "user-1"

    async def fake_fetch(token: str, month: str) -> dict:
        return {"categories": [], "budgets": [], "transactions": []}

    monkeypatch.setattr(main_module, "validate_token", fake_validate)
    monkeypatch.setattr(main_module, "fetch_month_data", fake_fetch)
    monkeypatch.setattr(main_module, "stream_gemini", _fake_stream)

    client = TestClient(app)
    response = client.post(
        "/insights/chat",
        headers={"Authorization": "Bearer tok"},
        json={"month": "2026-07", "messages": [{"role": "user", "text": "resumo?"}]},
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert 'data: {"text": "Olá"}' in response.text
    assert 'data: {"text": " mundo"}' in response.text


def test_chat_requires_token():
    client = TestClient(app)
    response = client.post(
        "/insights/chat",
        json={"month": "2026-07", "messages": [{"role": "user", "text": "oi"}]},
    )
    assert response.status_code == 401
```

Run: `... .venv/bin/pytest tests/test_chat.py -q` — Expected: FAIL.

- [ ] **Step 2: Implement gemini.py**

```python
"""Gemini free tier via plain httpx — mirrors the ativscrum-ai-api pattern."""

import json
from collections.abc import AsyncGenerator

import httpx

from app.config import get_settings
from app.errors import RateLimitedError, UpstreamError

GEMINI_MODEL = "gemini-2.5-flash"
_BASE = "https://generativelanguage.googleapis.com/v1beta"


async def stream_gemini(system: str, messages: list[dict[str, str]]) -> AsyncGenerator[str, None]:
    """Yields text chunks. `messages` roles: 'user' | 'assistant'."""
    settings = get_settings()
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [
            {"role": "model" if m["role"] == "assistant" else "user", "parts": [{"text": m["text"]}]}
            for m in messages
        ],
    }
    url = f"{_BASE}/models/{GEMINI_MODEL}:streamGenerateContent"
    async with httpx.AsyncClient(timeout=60) as client:
        async with client.stream(
            "POST",
            url,
            params={"alt": "sse", "key": settings.gemini_api_key},
            json=body,
        ) as response:
            if response.status_code == 429:
                raise RateLimitedError()
            if response.status_code != 200:
                detail = (await response.aread()).decode(errors="replace")[:500]
                raise UpstreamError(502, f"Gemini respondeu {response.status_code}: {detail}")
            async for line in response.aiter_lines():
                if not line.startswith("data:"):
                    continue
                payload = json.loads(line[5:].strip())
                for candidate in payload.get("candidates", []):
                    for part in candidate.get("content", {}).get("parts", []):
                        if part.get("text"):
                            yield part["text"]
```

- [ ] **Step 3: Implement service + endpoint**

`app/service.py`:

```python
import json
from collections.abc import AsyncGenerator, Callable

from app.context import build_context
from app.prompts import SYSTEM_PROMPT
from app.schemas import ChatRequest

StreamFn = Callable[..., AsyncGenerator[str, None]]


async def chat_events(
    request: ChatRequest,
    data: dict,
    stream_fn: StreamFn,
) -> AsyncGenerator[str, None]:
    """Yields SSE-formatted events for the chat reply."""
    system = SYSTEM_PROMPT.format(context=build_context(data, request.month))
    messages = [m.model_dump() for m in request.messages]
    async for chunk in stream_fn(system, messages):
        yield f"data: {json.dumps({'text': chunk}, ensure_ascii=False)}\n\n"
    yield "data: [DONE]\n\n"
```

Append to `app/main.py`:

```python
from fastapi import Header
from fastapi.responses import StreamingResponse

from app.gemini import stream_gemini
from app.schemas import ChatRequest
from app.service import chat_events
from app.supabase import fetch_month_data, validate_token


@app.post("/insights/chat")
async def insights_chat(
    request: ChatRequest,
    authorization: str = Header(default=""),
) -> StreamingResponse:
    if not authorization.startswith("Bearer "):
        raise UpstreamError(401, "Token ausente.")
    token = authorization.removeprefix("Bearer ")
    await validate_token(token)
    data = await fetch_month_data(token, request.month)
    return StreamingResponse(
        chat_events(request, data, stream_gemini),
        media_type="text/event-stream",
    )
```

(Imports go at the top of `main.py` with the existing ones; shown here
grouped for clarity.)

- [ ] **Step 4: Run tests, verify pass; lint; commit**

Run: `GEMINI_API_KEY=x SUPABASE_URL=http://x SUPABASE_ANON_KEY=x .venv/bin/pytest -q && .venv/bin/ruff check .`
Expected: all tests pass, ruff clean.

```bash
git add -A && git commit -m "feat: gemini-backed streaming insights chat endpoint"
```

### Task 16: Dockerfile + README

**Files:**

- Create: `Dockerfile`, `.dockerignore`, `README.md`

- [ ] **Step 1: Write files**

`Dockerfile`:

```dockerfile
FROM python:3.12-slim
WORKDIR /srv
COPY pyproject.toml ./
COPY app ./app
RUN pip install --no-cache-dir .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

`.dockerignore`:

```
.venv
__pycache__
tests
.env
```

`README.md`:

```markdown
# matematica-ai-api

FastAPI service serving the matematica monthly insights chat, backed by
Gemini free tier. Auth: the caller's Supabase access token (RLS applies —
no service key).

## Run

python3 -m venv .venv && .venv/bin/pip install -e '.[dev]'
cp .env.example .env # fill in
.venv/bin/uvicorn app.main:app --reload

## Endpoint

POST /insights/chat — `{ month: "YYYY-MM", messages: [{role, text}] }`,
`Authorization: Bearer <supabase access token>`. Streams SSE
`data: {"text": ...}` events, ends with `data: [DONE]`.

## Checks

.venv/bin/pytest -q && .venv/bin/ruff check .
```

- [ ] **Step 2: Verify and commit**

Run: `.venv/bin/pytest -q && .venv/bin/ruff check .` (with the env vars) — Expected: pass.

```bash
git add -A && git commit -m "chore: dockerfile and readme"
```
