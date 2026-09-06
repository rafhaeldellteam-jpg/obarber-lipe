import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isAdminEmail, getUserRole } from "@/lib/admin";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chamado de um Server Component — pode ser ignorado.
          }
        },
      },
    }
  );
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export type SessionContext = {
  email: string;
  role: "master" | "admin" | "barber";
  employeeId: string | null;
  isMaster: boolean;
  isAdmin: boolean;
  isBarber: boolean;
  allowed: boolean;
} | null;

/**
 * Resolve o contexto de permissão do usuário autenticado.
 * - master/admin -> allowed (acesso total), employeeId = null
 * - barber       -> allowed SE tiver um employeeId vinculado
 */
export async function getSessionContext(): Promise<SessionContext> {
  const user = await getCurrentUser();
  if (!user || !user.email || !isAdminEmail(user.email)) return null;

  const email = user.email;
  const role = getUserRole(email);
  if (!role) return null;

  if (role === "master" || role === "admin") {
    return { email, role, employeeId: null, isMaster: role === "master", isAdmin: true, isBarber: false, allowed: true };
  }

  // Barbeiro: precisa de um employeeId vinculado pelo email
  const { supabaseAdmin } = await import("@/lib/supabase");
  const { data: employee } = await supabaseAdmin
    .from("employees")
    .select("id, name")
    .eq("email", email)
    .maybeSingle();

  const employeeId = employee?.id ?? null;
  return {
    email,
    role,
    employeeId,
    isMaster: false,
    isAdmin: false,
    isBarber: true,
    allowed: Boolean(employeeId),
  };
}

export function hasServiceRole() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function requireAdmin() {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.allowed) return null;
  return ctx;
}

/** Somente master/admin (permite gestão de catálogo e demais barbeiros). */
export async function requireManager() {
  const ctx = await requireAdmin();
  if (!ctx) return null;
  if (ctx.isBarber) return null;
  return ctx;
}