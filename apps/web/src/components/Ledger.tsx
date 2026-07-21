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
    return <p style={{ color: color.textMuted }}>Nenhum lançamento neste mês.</p>;
  }

  return (
    <section style={{ background: color.card, borderRadius: radius.card, padding: space.md }}>
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
                style={{ padding: `${space.sm}px 0`, borderTop: `1px solid ${color.hairline}` }}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: motionTokens.duration.fast, ease: motionTokens.ease }}
              >
                <span style={{ color: color.textMuted, fontFamily: font.mono, fontSize: 12 }}>
                  {t.date.slice(8, 10)}/{t.date.slice(5, 7)}
                </span>
                <span className="flex-1" style={{ marginLeft: space.md }}>
                  {t.description || cat?.name || "—"}
                  <span style={{ color: color.textMuted, marginLeft: space.sm, fontSize: 12 }}>
                    {cat?.name}
                  </span>
                </span>
                <span style={{ fontFamily: font.mono, color: isIncome ? color.income : color.text }}>
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
