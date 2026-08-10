import { color, parseAuthCallbackCode } from "@matematica/core";
import type { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { Stack } from "expo-router";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Button, Platform, Text, TextInput, View } from "react-native";
import { sb } from "../lib/supabase";

const SessionContext = createContext<Session | null>(null);
export const useSession = () => useContext(SessionContext);

function AuthScreen() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | string>("idle");
  const [anonymousPending, setAnonymousPending] = useState(false);
  const linkingUrl = Linking.useLinkingURL();
  const handledUrl = useRef<string | null>(null);

  useEffect(() => {
    if (
      Platform.OS === "web" ||
      !linkingUrl ||
      handledUrl.current === linkingUrl
    ) {
      return;
    }

    const code = parseAuthCallbackCode(linkingUrl, "matematica");
    if (!code) return;
    handledUrl.current = linkingUrl;
    setStatus("Completing sign-in...");
    sb.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setStatus(
          "We couldn't complete this sign-in link. Request a new link and open it on this device.",
        );
      }
    });
  }, [linkingUrl]);

  async function sendLink() {
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: Linking.createURL("") },
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
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        padding: 24,
        backgroundColor: color.screen,
      }}
    >
      <Text style={{ color: color.text, fontSize: 24, marginBottom: 16 }}>
        matematica
      </Text>
      {status === "sent" ? (
        <Text style={{ color: color.textSecondary }}>
          Link sent. Check your email.
        </Text>
      ) : (
        <>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
            placeholderTextColor={color.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            style={{
              color: color.text,
              backgroundColor: color.card,
              borderRadius: 10,
              padding: 12,
              marginBottom: 12,
            }}
          />
          <Button title="Sign in" color={color.brand} onPress={sendLink} />
          {status !== "idle" && (
            <Text style={{ color: color.expense }}>{status}</Text>
          )}
        </>
      )}
      {__DEV__ && (
        <View style={{ marginTop: 12 }}>
          <Button
            title={anonymousPending ? "Signing in..." : "Continue anonymously"}
            color={color.textSecondary}
            disabled={anonymousPending}
            onPress={continueAnonymously}
          />
        </View>
      )}
    </View>
  );
}

export default function Layout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) return null;
  if (!session) return <AuthScreen />;
  return (
    <SessionContext.Provider value={session}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.screen },
        }}
      />
    </SessionContext.Provider>
  );
}
