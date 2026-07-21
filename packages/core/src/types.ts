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
