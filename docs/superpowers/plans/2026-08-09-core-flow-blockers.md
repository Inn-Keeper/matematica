# Matematica Core Flow Blockers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a new user create a category, set a monthly budget, and add a dated transaction on web and mobile.

**Architecture:** Extend the shared pure month model so active categories always produce summary rows, then reuse the existing Supabase data functions in the current one-screen web and mobile flows. Keep UI changes inline and use the already-installed Expo UI native date picker.

**Tech Stack:** TypeScript, React 19, React Native 0.86, Expo 57, `@expo/ui`, Supabase, Vitest.

## Global Constraints

- Preserve the deliberately approved English UI copy.
- Keep BRL amounts as integer cents and parse them with `parseAmountToCents`.
- Keep the existing one-screen month flow.
- Add no routes, onboarding wizard, seeded categories, shared UI package, or dependency.
- Use red-green TDD for shared pure logic.
- Apply the approved UI-test exception: verify app wiring through typecheck, lint, build, and runtime bundling.
- Do not change AI assistant behavior, loading states, retry behavior, deletion, or transaction editing.

---

### Task 1: Include Active Categories in Monthly Rollups

**Files:**

- Modify: `packages/core/src/rollup.test.ts`
- Modify: `packages/core/src/rollup.ts`

**Interfaces:**

- Consumes: `summarizeMonth(categories, budgets, transactions)` and `Category.archived`.
- Produces: `MonthSummary.rows` containing all active categories plus archived categories with month data.

- [ ] **Step 1: Write the failing active-category tests**

Replace the existing empty-month assertion and add the archived empty-category case:

```ts
it("includes active categories with no plan or transactions", () => {
  const s = summarizeMonth([cat("food", "expense")], [], []);
  expect(s.rows).toEqual([
    {
      category: cat("food", "expense"),
      plannedCents: 0,
      actualCents: 0,
      diffCents: 0,
    },
  ]);
  expect(s.remainingCents).toBe(0);
});

it("omits archived categories with no month data", () => {
  const s = summarizeMonth([cat("old", "expense", true)], [], []);
  expect(s.rows).toEqual([]);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `rtk pnpm --filter @matematica/core test -- rollup`

Expected: FAIL because `food` is absent from `rows`; the archived test remains green.

- [ ] **Step 3: Implement the minimum row-ID change**

Build the row IDs from active categories before merging plan and transaction IDs:

```ts
const ids = new Set([
  ...categories
    .filter((category) => !category.archived)
    .map((category) => category.id),
  ...planned.keys(),
  ...actual.keys(),
]);
```

Keep the existing row mapping, calculations, and alphabetical sort unchanged.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `rtk pnpm --filter @matematica/core test -- rollup`

Expected: all rollup and month utility tests pass.

- [ ] **Step 5: Commit the behavior**

```bash
rtk git add packages/core/src/rollup.ts packages/core/src/rollup.test.ts
rtk git commit -m "fix(core): include active categories in month summaries"
```

---

### Task 2: Add Shared Month Date Helpers

**Files:**

- Modify: `packages/core/src/rollup.test.ts`
- Modify: `packages/core/src/month.ts`

**Interfaces:**

- Produces: `monthDateBounds(month: string): { min: string; max: string }`.
- Produces: `defaultDateForMonth(month: string, today?: string): string`.
- Consumers: web quick-add and mobile transaction form.

- [ ] **Step 1: Write failing date-helper tests**

Import the two new functions and add:

```ts
it("returns inclusive month bounds including leap day", () => {
  expect(monthDateBounds("2024-02")).toEqual({
    min: "2024-02-01",
    max: "2024-02-29",
  });
});

it("uses today only when it belongs to the selected month", () => {
  expect(defaultDateForMonth("2026-08", "2026-08-09")).toBe("2026-08-09");
  expect(defaultDateForMonth("2026-07", "2026-08-09")).toBe("2026-07-01");
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `rtk pnpm --filter @matematica/core test -- rollup`

Expected: FAIL because `monthDateBounds` and `defaultDateForMonth` are not exported.

- [ ] **Step 3: Implement the helpers**

Add to `month.ts`:

```ts
export function monthDateBounds(month: string): { min: string; max: string } {
  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return {
    min: `${month}-01`,
    max: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function defaultDateForMonth(
  month: string,
  today = new Date().toISOString().slice(0, 10),
): string {
  return today.startsWith(`${month}-`) ? today : `${month}-01`;
}
```

- [ ] **Step 4: Run the core suite and verify GREEN**

Run: `rtk pnpm --filter @matematica/core test`

Expected: all core tests pass.

- [ ] **Step 5: Commit the helpers**

```bash
rtk git add packages/core/src/month.ts packages/core/src/rollup.test.ts
rtk git commit -m "feat(core): expose selected-month date helpers"
```

---

### Task 3: Unblock Web First Use

**Files:**

- Modify: `apps/web/src/components/CategoryManager.tsx`
- Modify: `apps/web/src/components/QuickAdd.tsx`
- Modify: `apps/web/src/components/SummaryTable.tsx`
- Modify: `apps/web/src/screens/MonthScreen.tsx`

**Interfaces:**

- Consumes: `monthDateBounds`, `defaultDateForMonth`, existing category CRUD, and existing budget upsert.
- Produces: an initially-open category manager and month-constrained transaction dates.

- [ ] **Step 1: Add an initially-open category manager option**

Extend the props with `initiallyOpen?: boolean`, default it to `false`, and initialize state from it:

```ts
export function CategoryManager({
  categories,
  onChanged,
  initiallyOpen = false,
}: {
  categories: Category[];
  onChanged: () => void;
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
```

- [ ] **Step 2: Put category setup first for an empty active list**

In `MonthScreen`, derive:

```ts
const hasActiveCategories =
  data?.categories.some((category) => !category.archived) ?? false;
```

Render `CategoryManager` with `initiallyOpen` before the summary when false.
Suppress the copy-plan and quick-add controls until an active category exists.
Render the collapsed category manager in its current lower position when true.
Keep the summary and ledger visible so archived month history is not hidden.

- [ ] **Step 3: Constrain web transaction dates**

In `QuickAdd`, replace the inline default calculation with:

```ts
const { min, max } = monthDateBounds(month);
const [date, setDate] = useState(defaultDateForMonth(month));
```

Pass `min={min}` and `max={max}` to the date input.

- [ ] **Step 4: Keep archived history read-only**

Only attach the planned-cell click handler and pointer cursor when
`!row.category.archived`. Archived rows retain their displayed historical
amounts but cannot create a new plan.

- [ ] **Step 5: Verify web wiring**

Run:

```bash
rtk pnpm --filter web typecheck
rtk pnpm lint
```

Expected: both commands exit successfully with no errors.

- [ ] **Step 6: Commit the web flow**

```bash
rtk git add apps/web/src/components/CategoryManager.tsx apps/web/src/components/QuickAdd.tsx apps/web/src/components/SummaryTable.tsx apps/web/src/screens/MonthScreen.tsx
rtk git commit -m "fix(web): unblock first month setup"
```

---

### Task 4: Add Mobile Category, Budget, and Date Controls

**Files:**

- Modify: `apps/mobile/src/app/index.tsx`

**Interfaces:**

- Consumes: `addCategory`, `upsertBudget`, `parseAmountToCents`, `monthDateBounds`, `defaultDateForMonth`, `Kind`, and `@expo/ui/community/datetime-picker`.
- Produces: mobile category creation, inline budget saves, and a native constrained transaction date.

- [ ] **Step 1: Add imports and local state**

Import `DateTimePicker` and the core functions/types. Add state for:

```ts
const [date, setDate] = useState(defaultDateForMonth(month));
const [datePickerOpen, setDatePickerOpen] = useState(false);
const [categoryFormOpen, setCategoryFormOpen] = useState(false);
const [categoryName, setCategoryName] = useState("");
const [categoryKind, setCategoryKind] = useState<Kind>("expense");
const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
const [budgetDraft, setBudgetDraft] = useState("");
```

When `month` changes, reset `date` with `defaultDateForMonth(month)` and close
the date picker.

- [ ] **Step 2: Make the shared action guard report success**

Change `guard` to return `true` after a successful reload and `false` after
setting an error. Make `addTx` asynchronous and clear its fields only when the
insert succeeds.

- [ ] **Step 3: Implement category creation**

Add an async handler that trims the name, rejects an empty value with
`"Enter a category name"`, calls:

```ts
addCategory(sb, { name: categoryName.trim(), kind: categoryKind });
```

and clears/closes the form only after success.

Render the form before the summary whenever `active.length === 0`. Otherwise,
render a secondary `Add category` action below the ledger that expands the same
form. Use two explicit chips for `Expense` and `Income`.

- [ ] **Step 4: Implement explicit inline budget editing**

For every non-archived summary row, render the planned amount as a pressable
label. Pressing it copies the BRL decimal value into `budgetDraft` and sets
`editingBudgetId`.

While editing, render a decimal-pad `TextInput` plus explicit `Save` and
`Cancel` actions. `Save` parses the draft, surfaces `"Invalid amount"` on
failure, and calls:

```ts
upsertBudget(sb, {
  category_id: row.category.id,
  month,
  planned_cents: cents,
});
```

Close the editor only after success. Archived historical rows remain read-only.

- [ ] **Step 5: Add the constrained native date picker**

Derive `{ min, max } = monthDateBounds(month)`. Add a labelled date pressable
above amount entry. When open, render:

```tsx
<DateTimePicker
  value={new Date(`${date}T12:00:00`)}
  mode="date"
  minimumDate={new Date(`${min}T12:00:00`)}
  maximumDate={new Date(`${max}T12:00:00`)}
  presentation="dialog"
  accentColor={color.brand}
  themeVariant="dark"
  onValueChange={(_event, selectedDate) => {
    const year = selectedDate.getFullYear();
    const monthNumber = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const day = String(selectedDate.getDate()).padStart(2, "0");
    setDate(`${year}-${monthNumber}-${day}`);
    setDatePickerOpen(false);
  }}
  onDismiss={() => setDatePickerOpen(false)}
/>
```

Use `date` in `addTransaction` instead of recomputing today.

- [ ] **Step 6: Verify mobile wiring**

Run:

```bash
rtk pnpm --filter mobile typecheck
rtk pnpm lint
```

Expected: both commands exit successfully with no errors.

- [ ] **Step 7: Commit the mobile flow**

```bash
rtk git add apps/mobile/src/app/index.tsx
rtk git commit -m "fix(mobile): complete first month setup flow"
```

---

### Task 5: Full Verification and Runtime Bundling

**Files:**

- Verify only; modify implementation files only if a check exposes a defect.

**Interfaces:**

- Consumes: completed core, web, and mobile behavior.
- Produces: verified repository state and an iOS-compatible JavaScript bundle.

- [ ] **Step 1: Run the complete project gate**

Run: `rtk pnpm verify`

Expected: core/web/mobile typechecks, lint, format check, all tests, and web
production build pass. The pre-existing web chunk-size warning is acceptable.

- [ ] **Step 2: Build the mobile iOS JavaScript bundle**

Run:

```bash
rtk pnpm --filter mobile exec expo export --platform ios --output-dir /private/tmp/matematica-mobile-export
```

Expected: Expo produces the iOS bundle successfully, proving that the native
date-picker import resolves for the target platform.

- [ ] **Step 3: Inspect the final diff**

Run:

```bash
rtk git diff --check HEAD~3..HEAD
rtk git status --short
```

Expected: no whitespace errors and a clean worktree.

- [ ] **Step 4: Report delivery state**

Report the commits created, tests and builds run, any runtime limitation, and
confirm that nothing was pushed.
