import type { User } from "@supabase/supabase-js";

/** Identifica como o usuário criou a conta: local (e-mail/senha) ou Google. */
export function signupMethodFromUser(
  user: Pick<User, "app_metadata"> | null | undefined
): "local" | "google" {
  const provider = user?.app_metadata?.provider;
  return provider === "google" ? "google" : "local";
}