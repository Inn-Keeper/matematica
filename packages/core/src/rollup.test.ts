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
