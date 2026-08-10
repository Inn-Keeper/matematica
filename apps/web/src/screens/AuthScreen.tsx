import { color, font, radius, space } from "@matematica/core";
import { useState } from "react";
import { sb } from "../lib/supabase";

export function AuthScreen() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | string>("idle");
  const [anonymousPending, setAnonymousPending] = useState(false);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    setStatus(error ? error.message : "sent");
  }

  async function continueAnonymously() {
    setAnonymousPending(true);
    const { error } = await sb.auth.signInAnonymously();
    if (error) setStatus(error.message);
    setAnonymousPending(false);
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
            Link sent. Check your email.
          </p>
        ) : (
          <>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
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
              Sign in
            </button>
            {status !== "idle" && (
              <p style={{ color: color.expense }}>{status}</p>
            )}
          </>
        )}
        {import.meta.env.DEV && (
          <button
            type="button"
            onClick={continueAnonymously}
            disabled={anonymousPending}
            style={{
              background: color.cardAlt,
              color: color.text,
              border: `1px solid ${color.hairline}`,
              borderRadius: radius.control,
              padding: space.sm,
              fontWeight: 700,
              opacity: anonymousPending ? 0.6 : 1,
            }}
          >
            {anonymousPending ? "Signing in..." : "Continue anonymously"}
          </button>
        )}
      </form>
    </main>
  );
}
