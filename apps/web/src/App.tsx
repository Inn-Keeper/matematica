import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { sb } from "./lib/supabase";
import { AuthScreen } from "./screens/AuthScreen";
import { MonthScreen } from "./screens/MonthScreen";

export default function App() {
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
  return session ? <MonthScreen session={session} /> : <AuthScreen />;
}
