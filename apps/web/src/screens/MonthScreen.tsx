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
  const hasActiveCategories =
    data?.categories.some((category) => !category.archived) ?? false;

  async function copyPlan() {
    try {
      await copyPlanFromPreviousMonth(
        sb,
        month,
        data?.categories
          .filter((category) => !category.archived)
          .map((category) => category.id) ?? [],
      );
      reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const monthLabel = new Date(`${month}-15`).toLocaleDateString("en-US", {
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
              aria-label="Previous month"
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
              aria-label="Next month"
              onClick={() => setMonth((m) => addMonths(m, 1))}
            >
              →
            </button>
          </div>
          <button
            style={{ color: color.textMuted }}
            onClick={() => sb.auth.signOut()}
          >
            sign out
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
              {!hasActiveCategories && (
                <CategoryManager
                  categories={data.categories}
                  onChanged={reload}
                  initiallyOpen
                />
              )}
              {emptyPlan && hasActiveCategories && (
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
                  Copy last month's plan
                </button>
              )}
              <SummaryTable
                summary={summary}
                month={month}
                onChanged={reload}
              />
              {hasActiveCategories && (
                <QuickAdd
                  categories={data.categories}
                  month={month}
                  onAdded={reload}
                />
              )}
              <Ledger
                transactions={data.transactions}
                categories={data.categories}
                onChanged={reload}
              />
              {hasActiveCategories && (
                <CategoryManager
                  categories={data.categories}
                  onChanged={reload}
                />
              )}
              <ChatPanel month={month} session={session} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
