import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface AdminAuthResult {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: true } | { success: false; error: string }>;
  signOut: () => Promise<void>;
}

export function useAdminAuth(): AdminAuthResult {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from storage (handles page refresh)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Keep session in sync with auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false as const, error: error.message };
    return { success: true as const };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return { session, loading, signIn, signOut };
}
