import {
  addCategory,
  addMonths,
  addTransaction,
  color,
  copyPlanFromPreviousMonth,
  currentMonth,
  defaultDateForMonth,
  deleteTransaction,
  fetchMonthData,
  formatBRL,
  monthDateBounds,
  parseAmountToCents,
  streamInsights,
  stepDateWithinMonth,
  summarizeMonth,
  upsertBudget,
  type Budget,
  type Category,
  type ChatMessage,
  type Kind,
  type Transaction,
} from "@matematica/core";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { sb } from "../lib/supabase";
import { useSession } from "./_layout";

interface MonthData {
  categories: Category[];
  budgets: Budget[];
  transactions: Transaction[];
}

const row = { flexDirection: "row", alignItems: "center" } as const;

export default function MonthScreen() {
  const session = useSession();
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<MonthData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(defaultDateForMonth(month));
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryKind, setCategoryKind] = useState<Kind>("expense");
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [budgetDraft, setBudgetDraft] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    fetchMonthData(sb, month).then(setData, (e: Error) => setError(e.message));
  }, [month]);

  useEffect(() => {
    setData(null);
    setDate(defaultDateForMonth(month));
    setEditingBudgetId(null);
    setBudgetDraft("");
    reload();
  }, [month, reload]);

  const summary = data
    ? summarizeMonth(data.categories, data.budgets, data.transactions)
    : null;
  const active = data?.categories.filter((c) => !c.archived) ?? [];

  async function guard(action: () => Promise<unknown>) {
    try {
      await action();
      setError(null);
      reload();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }

  async function addTx() {
    const cents = parseAmountToCents(amount);
    if (cents === null || cents === 0 || !categoryId) {
      setError("Invalid amount or category");
      return;
    }
    const saved = await guard(() =>
      addTransaction(sb, {
        category_id: categoryId,
        date,
        amount_cents: cents,
        description,
      }),
    );
    if (saved) {
      setAmount("");
      setDescription("");
    }
  }

  async function createCategory() {
    const name = categoryName.trim();
    if (!name) {
      setError("Enter a category name");
      return;
    }
    const saved = await guard(() =>
      addCategory(sb, { name, kind: categoryKind }),
    );
    if (saved) {
      setCategoryName("");
      setCategoryFormOpen(false);
    }
  }

  async function saveBudget(categoryId: string) {
    const cents = parseAmountToCents(budgetDraft);
    if (cents === null) {
      setError("Invalid amount");
      return;
    }
    const saved = await guard(() =>
      upsertBudget(sb, {
        category_id: categoryId,
        month,
        planned_cents: cents,
      }),
    );
    if (saved) setEditingBudgetId(null);
  }

  async function sendChat() {
    const question = chatInput.trim();
    if (!question || busy || !session) return;
    const history: ChatMessage[] = [...chat, { role: "user", text: question }];
    setChat([...history, { role: "assistant", text: "…" }]);
    setChatInput("");
    setBusy(true);
    try {
      let reply = "";
      for await (const chunk of streamInsights({
        apiUrl: process.env.EXPO_PUBLIC_AI_API_URL!,
        accessToken: session.access_token,
        month,
        messages: history,
      })) {
        reply += chunk;
        setChat([...history, { role: "assistant", text: reply }]);
      }
    } catch (e) {
      setChat(history);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const monthLabel = new Date(`${month}-15`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const { min, max } = monthDateBounds(month);
  const categoryControl =
    active.length === 0 || categoryFormOpen ? (
      <View
        style={{
          backgroundColor: color.card,
          borderRadius: 16,
          padding: 16,
          gap: 10,
        }}
      >
        <Text style={{ color: color.text, fontWeight: "700" }}>
          {active.length === 0 ? "Create your first category" : "Add category"}
        </Text>
        <TextInput
          value={categoryName}
          onChangeText={setCategoryName}
          placeholder="Category name"
          placeholderTextColor={color.textMuted}
          accessibilityLabel="Category name"
          style={{
            color: color.text,
            backgroundColor: color.cardAlt,
            borderRadius: 10,
            padding: 10,
          }}
        />
        <View style={[row, { gap: 8 }]}>
          {(["expense", "income"] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => setCategoryKind(value)}
              style={{
                backgroundColor:
                  categoryKind === value ? color.brandSoft : color.cardAlt,
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Text
                style={{
                  color:
                    categoryKind === value ? color.brand : color.textSecondary,
                  fontWeight: "500",
                }}
              >
                {value === "expense" ? "Expense" : "Income"}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={[row, { gap: 12 }]}>
          <Pressable
            onPress={createCategory}
            style={{
              backgroundColor: color.brand,
              borderRadius: 10,
              paddingHorizontal: 16,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: color.screen, fontWeight: "700" }}>Add</Text>
          </Pressable>
          {active.length > 0 && (
            <Pressable onPress={() => setCategoryFormOpen(false)}>
              <Text style={{ color: color.textMuted }}>Cancel</Text>
            </Pressable>
          )}
        </View>
      </View>
    ) : (
      <Pressable onPress={() => setCategoryFormOpen(true)}>
        <Text style={{ color: color.textMuted }}>Add category</Text>
      </Pressable>
    );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.screen }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      <View style={[row, { justifyContent: "space-between", marginTop: 40 }]}>
        <Pressable onPress={() => setMonth((m) => addMonths(m, -1))}>
          <Text style={{ color: color.text, fontSize: 22 }}>←</Text>
        </Pressable>
        <Text
          style={{
            color: color.text,
            fontSize: 20,
            textTransform: "capitalize",
          }}
        >
          {monthLabel}
        </Text>
        <Pressable onPress={() => setMonth((m) => addMonths(m, 1))}>
          <Text style={{ color: color.text, fontSize: 22 }}>→</Text>
        </Pressable>
      </View>

      {error && <Text style={{ color: color.expense }}>{error}</Text>}

      {data && summary && (
        <>
          {active.length === 0 && categoryControl}

          {active.length > 0 && data.budgets.length === 0 && (
            <Pressable
              onPress={() => guard(() => copyPlanFromPreviousMonth(sb, month))}
              style={{
                backgroundColor: color.brandSoft,
                borderRadius: 10,
                padding: 12,
              }}
            >
              <Text style={{ color: color.brand, textAlign: "center" }}>
                Copy last month's plan
              </Text>
            </Pressable>
          )}

          <View
            style={{
              backgroundColor: color.card,
              borderRadius: 16,
              padding: 16,
              gap: 8,
            }}
          >
            {summary.rows.map((r) => (
              <View
                key={r.category.id}
                style={{
                  gap: 6,
                  paddingVertical: 4,
                  borderTopWidth: 1,
                  borderTopColor: color.hairline,
                }}
              >
                <View style={[row, { justifyContent: "space-between" }]}>
                  <Text style={{ color: color.text, flex: 1 }}>
                    {r.category.name}
                  </Text>
                  <Text style={{ color: color.textSecondary, marginRight: 12 }}>
                    Actual {formatBRL(r.actualCents)}
                  </Text>
                  <Text
                    style={{
                      color:
                        r.diffCents === 0
                          ? color.textMuted
                          : r.diffCents > 0
                            ? color.income
                            : color.expense,
                    }}
                  >
                    {r.diffCents > 0 ? "+" : ""}
                    {formatBRL(r.diffCents)}
                  </Text>
                </View>
                {editingBudgetId === r.category.id && !r.category.archived ? (
                  <View style={[row, { gap: 8 }]}>
                    <TextInput
                      autoFocus
                      value={budgetDraft}
                      onChangeText={setBudgetDraft}
                      keyboardType="decimal-pad"
                      accessibilityLabel={`Planned amount for ${r.category.name}`}
                      style={{
                        flex: 1,
                        color: color.text,
                        backgroundColor: color.cardAlt,
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                      }}
                    />
                    <Pressable onPress={() => saveBudget(r.category.id)}>
                      <Text style={{ color: color.brand, fontWeight: "700" }}>
                        Save
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => setEditingBudgetId(null)}>
                      <Text style={{ color: color.textMuted }}>Cancel</Text>
                    </Pressable>
                  </View>
                ) : r.category.archived ? (
                  <Text style={{ color: color.textMuted, fontSize: 12 }}>
                    Archived · Plan {formatBRL(r.plannedCents)}
                  </Text>
                ) : (
                  <Pressable
                    onPress={() => {
                      setEditingBudgetId(r.category.id);
                      setBudgetDraft(
                        (r.plannedCents / 100).toFixed(2).replace(".", ","),
                      );
                    }}
                  >
                    <Text style={{ color: color.brand, fontSize: 12 }}>
                      Plan {formatBRL(r.plannedCents)} · Edit
                    </Text>
                  </Pressable>
                )}
              </View>
            ))}
            <View
              style={[
                row,
                {
                  justifyContent: "space-between",
                  borderTopWidth: 1,
                  borderTopColor: color.hairline,
                  paddingTop: 8,
                },
              ]}
            >
              <Text style={{ color: color.text, fontWeight: "700" }}>
                Month balance
              </Text>
              <Text
                style={{
                  color:
                    summary.remainingCents >= 0 ? color.income : color.expense,
                  fontWeight: "700",
                }}
              >
                {formatBRL(summary.remainingCents)}
              </Text>
            </View>
          </View>

          {active.length > 0 && (
            <View
              style={{
                backgroundColor: color.card,
                borderRadius: 16,
                padding: 16,
                gap: 8,
              }}
            >
              <View
                style={[
                  row,
                  {
                    justifyContent: "space-between",
                    backgroundColor: color.cardAlt,
                    borderRadius: 10,
                  },
                ]}
              >
                <Pressable
                  onPress={() =>
                    setDate((value) => stepDateWithinMonth(value, -1))
                  }
                  disabled={date === min}
                  accessibilityRole="button"
                  accessibilityLabel="Previous transaction day"
                  accessibilityState={{ disabled: date === min }}
                  style={{
                    minWidth: 44,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    opacity: date === min ? 0.35 : 1,
                  }}
                >
                  <Text style={{ color: color.text, fontSize: 18 }}>←</Text>
                </Pressable>
                <Text
                  style={{
                    color: color.textSecondary,
                    flexShrink: 1,
                    textAlign: "center",
                  }}
                >
                  Date {dateLabel}
                </Text>
                <Pressable
                  onPress={() =>
                    setDate((value) => stepDateWithinMonth(value, 1))
                  }
                  disabled={date === max}
                  accessibilityRole="button"
                  accessibilityLabel="Next transaction day"
                  accessibilityState={{ disabled: date === max }}
                  style={{
                    minWidth: 44,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    opacity: date === max ? 0.35 : 1,
                  }}
                >
                  <Text style={{ color: color.text, fontSize: 18 }}>→</Text>
                </Pressable>
              </View>
              <View style={[row, { gap: 8, flexWrap: "wrap" }]}>
                {active.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => setCategoryId(c.id)}
                    style={{
                      backgroundColor:
                        categoryId === c.id ? color.brandSoft : color.cardAlt,
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          categoryId === c.id
                            ? color.brand
                            : color.textSecondary,
                      }}
                    >
                      {c.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="amount"
                placeholderTextColor={color.textMuted}
                keyboardType="decimal-pad"
                style={{
                  color: color.text,
                  backgroundColor: color.cardAlt,
                  borderRadius: 10,
                  padding: 10,
                }}
              />
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="description"
                placeholderTextColor={color.textMuted}
                style={{
                  color: color.text,
                  backgroundColor: color.cardAlt,
                  borderRadius: 10,
                  padding: 10,
                }}
              />
              <Pressable
                onPress={addTx}
                style={{
                  backgroundColor: color.brand,
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <Text
                  style={{
                    color: color.screen,
                    textAlign: "center",
                    fontWeight: "700",
                  }}
                >
                  Add
                </Text>
              </Pressable>
            </View>
          )}

          <View
            style={{
              backgroundColor: color.card,
              borderRadius: 16,
              padding: 16,
            }}
          >
            {data.transactions.length === 0 && (
              <Text style={{ color: color.textMuted }}>
                No transactions this month.
              </Text>
            )}
            {data.transactions.map((t) => {
              const cat = data.categories.find((c) => c.id === t.category_id);
              return (
                <View
                  key={t.id}
                  style={[
                    row,
                    { justifyContent: "space-between", paddingVertical: 6 },
                  ]}
                >
                  <Text style={{ color: color.textMuted, fontSize: 12 }}>
                    {t.date.slice(8, 10)}/{t.date.slice(5, 7)}
                  </Text>
                  <Text
                    style={{ color: color.text, flex: 1, marginLeft: 12 }}
                    numberOfLines={1}
                  >
                    {t.description || cat?.name || "—"}
                  </Text>
                  <Text
                    style={{
                      color: cat?.kind === "income" ? color.income : color.text,
                    }}
                  >
                    {cat?.kind === "income" ? "+" : "−"}
                    {formatBRL(t.amount_cents)}
                  </Text>
                  <Pressable
                    onPress={() => guard(() => deleteTransaction(sb, t.id))}
                  >
                    <Text style={{ color: color.expense, marginLeft: 12 }}>
                      ×
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          {active.length > 0 && categoryControl}

          <View
            style={{
              backgroundColor: color.card,
              borderRadius: 16,
              padding: 16,
              gap: 8,
            }}
          >
            <Text style={{ color: color.text, fontWeight: "700" }}>
              Month assistant
            </Text>
            {chat.map((m, i) => (
              <Text
                key={i}
                style={{
                  color: m.role === "user" ? color.brand : color.text,
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                {m.text}
              </Text>
            ))}
            <View style={[row, { gap: 8 }]}>
              <TextInput
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Ask about this month…"
                placeholderTextColor={color.textMuted}
                style={{
                  flex: 1,
                  color: color.text,
                  backgroundColor: color.cardAlt,
                  borderRadius: 10,
                  padding: 10,
                }}
              />
              <Pressable
                onPress={sendChat}
                disabled={busy}
                style={{
                  backgroundColor: color.brand,
                  borderRadius: 10,
                  padding: 10,
                  opacity: busy ? 0.5 : 1,
                }}
              >
                <Text style={{ color: color.screen, fontWeight: "700" }}>
                  →
                </Text>
              </Pressable>
            </View>
          </View>
        </>
      )}
      <Pressable onPress={() => sb.auth.signOut()}>
        <Text
          style={{
            color: color.textMuted,
            textAlign: "center",
            marginBottom: 40,
          }}
        >
          sign out
        </Text>
      </Pressable>
    </ScrollView>
  );
}
