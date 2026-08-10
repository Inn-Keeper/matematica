import { describe, expect, it } from "vitest";
import { filterBudgetsByCategoryIds } from "./data";

describe("filterBudgetsByCategoryIds", () => {
  const budgets = [
    { category_id: "active", planned_cents: 10_000 },
    { category_id: "archived", planned_cents: 5_000 },
  ];

  it("keeps only budgets belonging to active categories", () => {
    expect(filterBudgetsByCategoryIds(budgets, ["active"])).toEqual([
      budgets[0],
    ]);
  });

  it("returns no budgets when there are no active categories", () => {
    expect(filterBudgetsByCategoryIds(budgets, [])).toEqual([]);
  });
});
