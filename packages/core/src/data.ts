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

async function requireUser(sb: SupabaseClient) {
  const { data, error } = await sb.auth.getUser();
  if (error) throw new Error(error.message);
  return data.user;
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
  const user = await requireUser(sb);
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
  const user = await requireUser(sb);
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
  const user = await requireUser(sb);
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
  const user = await requireUser(sb);
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
