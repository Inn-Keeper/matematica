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
