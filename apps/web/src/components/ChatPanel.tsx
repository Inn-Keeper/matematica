import {
  color,
  font,
  motionTokens,
  radius,
  space,
  streamInsights,
  type ChatMessage,
} from "@matematica/core";
import type { Session } from "@supabase/supabase-js";
import { motion } from "motion/react";
import { useState } from "react";

export function ChatPanel({
  month,
  session,
}: {
  month: string;
  session: Session;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || busy) return;
    const history: ChatMessage[] = [
      ...messages,
      { role: "user", text: question },
    ];
    setMessages([...history, { role: "assistant", text: "" }]);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      let reply = "";
      for await (const chunk of streamInsights({
        apiUrl: import.meta.env.VITE_AI_API_URL,
        accessToken: session.access_token,
        month,
        messages: history,
      })) {
        reply += chunk;
        setMessages([...history, { role: "assistant", text: reply }]);
      }
    } catch (err) {
      setMessages(history);
      setError((err as Error).message);
    } finally {
      setBusy(false);
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
      <h2
        style={{
          fontFamily: font.display,
          fontSize: 16,
          marginBottom: space.sm,
        }}
      >
        Assistente do mês
      </h2>
      <div className="flex flex-col" style={{ gap: space.sm }}>
        {messages.map((m, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: motionTokens.duration.fast }}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              background: m.role === "user" ? color.brandSoft : color.cardAlt,
              color: m.role === "user" ? color.brand : color.text,
              borderRadius: radius.control,
              padding: `${space.sm}px ${space.md}px`,
              maxWidth: "85%",
              whiteSpace: "pre-wrap",
            }}
          >
            {m.text || "…"}
          </motion.p>
        ))}
      </div>
      {error && (
        <p style={{ color: color.expense, marginTop: space.sm }}>{error}</p>
      )}
      <form
        onSubmit={send}
        className="flex"
        style={{ gap: space.sm, marginTop: space.md }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte sobre este mês…"
          className="flex-1"
          style={{
            background: color.cardAlt,
            borderRadius: radius.control,
            padding: `${space.sm}px ${space.md}px`,
            border: `1px solid ${color.hairline}`,
          }}
        />
        <button
          disabled={busy}
          style={{
            background: color.brand,
            color: color.screen,
            borderRadius: radius.control,
            padding: `${space.sm}px ${space.md}px`,
            fontWeight: 700,
            opacity: busy ? 0.5 : 1,
          }}
        >
          →
        </button>
      </form>
    </section>
  );
}
