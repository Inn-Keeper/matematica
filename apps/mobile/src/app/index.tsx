import {
  addMonths,
  addTransaction,
  color,
  copyPlanFromPreviousMonth,
  currentMonth,
  deleteTransaction,
  fetchMonthData,
  formatBRL,
  parseAmountToCents,
  streamInsights,
  summarizeMonth,
  type Budget,
  type Category,
  type ChatMessage,
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
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    fetchMonthData(sb, month).then(setData, (e: Error) => setError(e.message));
  }, [month]);

  useEffect(() => {
    setData(null);
    reload();
  }, [reload]);

  const summary = data
    ? summarizeMonth(data.categories, data.budgets, data.transactions)
    : null;
  const active = data?.categories.filter((c) => !c.archived) ?? [];

  async function guard(action: () => Promise<unknown>) {
    try {
      await action();
      setError(null);
      reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function addTx() {
    const cents = parseAmountToCents(amount);
    if (cents === null || cents === 0 || !categoryId) {
      setError("Invalid amount or category");
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    guard(() =>
      addTransaction(sb, {
        category_id: categoryId,
        date: today.startsWith(month) ? today : `${month}-01`,
        amount_cents: cents,
        description,
      }),
    ).then(() => {
      setAmount("");
      setDescription("");
    });
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
          {data.budgets.length === 0 && (
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
                style={[row, { justifyContent: "space-between" }]}
              >
                <Text style={{ color: color.text, flex: 1 }}>
                  {r.category.name}
                </Text>
                <Text style={{ color: color.textSecondary, marginRight: 12 }}>
                  {formatBRL(r.actualCents)} / {formatBRL(r.plannedCents)}
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

          <View
            style={{
              backgroundColor: color.card,
              borderRadius: 16,
              padding: 16,
              gap: 8,
            }}
          >
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
                        categoryId === c.id ? color.brand : color.textSecondary,
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
                Adicionar
              </Text>
            </Pressable>
          </View>

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
