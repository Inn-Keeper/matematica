import {
  addCategory,
  color,
  radius,
  renameCategory,
  setCategoryArchived,
  space,
  type Category,
  type Kind,
} from "@matematica/core";
import { useState } from "react";
import { sb } from "../lib/supabase";

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
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("expense");
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    try {
      await action();
      setError(null);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!open) {
    return (
      <button
        className="self-start"
        style={{ color: color.textMuted }}
        onClick={() => setOpen(true)}
      >
        manage categories
      </button>
    );
  }

  return (
    <section
      style={{
        background: color.card,
        borderRadius: radius.card,
        padding: space.md,
      }}
    >
      <div className="flex items-center justify-between">
        <h2 style={{ fontWeight: 700 }}>Categories</h2>
        <button
          style={{ color: color.textMuted }}
          onClick={() => setOpen(false)}
        >
          Close
        </button>
      </div>
      {error && <p style={{ color: color.expense }}>{error}</p>}
      <ul style={{ marginTop: space.sm }}>
        {categories.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between"
            style={{ padding: `${space.xs}px 0` }}
          >
            <input
              defaultValue={c.name}
              onBlur={(e) =>
                e.target.value !== c.name &&
                run(() => renameCategory(sb, c.id, e.target.value))
              }
              style={{
                background: "transparent",
                opacity: c.archived ? 0.4 : 1,
              }}
            />
            <span style={{ color: color.textMuted, fontSize: 12 }}>
              {c.kind === "income" ? "income" : "expense"}
            </span>
            <button
              style={{ color: color.textMuted, marginLeft: space.md }}
              onClick={() =>
                run(() => setCategoryArchived(sb, c.id, !c.archived))
              }
            >
              {c.archived ? "restore" : "archive"}
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex items-center"
        style={{ gap: space.sm, marginTop: space.sm }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          run(() => addCategory(sb, { name: name.trim(), kind })).then(() =>
            setName(""),
          );
        }}
      >
        <input
          placeholder="new category"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            background: color.cardAlt,
            borderRadius: radius.control,
            padding: `${space.xs}px ${space.sm}px`,
          }}
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as Kind)}
          style={{
            background: color.cardAlt,
            borderRadius: radius.control,
            padding: space.xs,
          }}
        >
          <option value="expense">expense</option>
          <option value="income">income</option>
        </select>
        <button type="submit" style={{ color: color.brand, fontWeight: 700 }}>
          Add
        </button>
      </form>
    </section>
  );
}
