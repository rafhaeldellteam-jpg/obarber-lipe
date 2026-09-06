"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { isAdminEmail, getUserRole } from "@/lib/admin";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  role: "master" | "admin" | "barber" | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    name?: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<AuthContextValue["role"]>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const router = useRouter();

  const getSupabase = useCallback(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient();
    return supabaseRef.current;
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await getSupabase().auth.getSession();
    const current = data.session?.user ?? null;
    setUser(current);
    setIsAdmin(isAdminEmail(current?.email));
    setRole(getUserRole(current?.email) ?? null);
  }, [getSupabase]);

  useEffect(() => {
    void refresh().finally(() => setLoading(false));

    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange((_event, session) => {
      const current = session?.user ?? null;
      setUser(current);
      setIsAdmin(isAdminEmail(current?.email));
      setRole(getUserRole(current?.email) ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [getSupabase, refresh]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await getSupabase().auth.signInWithPassword({
        email,
        password,
      });
      return { error: error ? error.message : null };
    },
    [getSupabase]
  );

  const signInWithGoogle = useCallback(async () => {
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    return { error: error ? error.message : null };
  }, [getSupabase]);

  const signUp = useCallback(
    async (email: string, password: string, name?: string) => {
      const { error } = await getSupabase().auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: name ? { name: name.trim() } : undefined,
        },
      });
      return { error: error ? error.message : null };
    },
    [getSupabase]
  );

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    setUser(null);
    setIsAdmin(false);
    setRole(null);
    router.push("/");
  }, [getSupabase, router]);

  return (
    <AuthContext.Provider
      value={{ user, loading, isAdmin, role, signIn, signInWithGoogle, signUp, signOut, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}