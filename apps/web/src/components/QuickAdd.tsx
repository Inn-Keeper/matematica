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
    if (cents === null || cents === 0) return setError("Invalid amount");
    if (!categoryId) return setError("Choose a category");
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
        <option value="">category…</option>
        {active.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <input
        placeholder="amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        className="w-24"
        style={field}
      />
      <input
        placeholder="description"
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
