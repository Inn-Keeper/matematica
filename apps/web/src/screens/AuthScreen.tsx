import { color, font, radius, space } from "@matematica/core";
import { useState } from "react";
import { sb } from "../lib/supabase";

export function AuthScreen() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | string>("idle");

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await sb.auth.signInWithOtp({ email });
    setStatus(error ? error.message : "sent");
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center"
      style={{
        background: color.screen,
        fontFamily: font.body,
        color: color.text,
      }}
    >
      <form
        onSubmit={sendLink}
        className="flex w-80 flex-col"
        style={{
          gap: space.md,
          background: color.card,
          borderRadius: radius.card,
          padding: space.lg,
        }}
      >
        <h1 style={{ fontFamily: font.display, fontSize: 24 }}>matematica</h1>
        {status === "sent" ? (
          <p style={{ color: color.textSecondary }}>
            Link enviado. Confira seu e-mail.
          </p>
        ) : (
          <>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full"
              style={{
                background: color.cardAlt,
                borderRadius: radius.control,
                padding: `${space.sm}px ${space.md}px`,
                border: `1px solid ${color.hairline}`,
              }}
            />
            <button
              type="submit"
              style={{
                background: color.brand,
                color: color.screen,
                borderRadius: radius.control,
                padding: space.sm,
                fontWeight: 700,
              }}
            >
              Entrar
            </button>
            {status !== "idle" && (
              <p style={{ color: color.expense }}>{status}</p>
            )}
          </>
        )}
      </form>
    </main>
  );
}
