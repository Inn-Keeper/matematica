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
      setError("Invalid amount");
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
            <th style={{ fontWeight: 500 }}>Planned</th>
            <th style={{ fontWeight: 500 }}>Actual</th>
            <th style={{ fontWeight: 500 }}>Diff</th>
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
                    income
                  </span>
                )}
              </td>
              <td
                className={`${row.category.archived ? "" : "cursor-pointer"} text-right`}
                style={{ fontFamily: font.mono }}
                onClick={
                  row.category.archived
                    ? undefined
                    : () => {
                        setEditing(row.category.id);
                        setDraft(
                          (row.plannedCents / 100)
                            .toFixed(2)
                            .replace(".", ","),
                        );
                      }
                }
              >
                {editing === row.category.id && !row.category.archived ? (
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
            <td style={{ padding: `${space.sm}px 0` }}>Month balance</td>
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
