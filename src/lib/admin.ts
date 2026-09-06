export type UserRole = "master" | "admin" | "barber";

export type AuthUser = {
  email: string;
  role: UserRole;
  employeeId: string | null;
  name: string | null;
};

// Usuários com acesso ao painel.
// role:
//   master  -> acesso total (não vinculado a barbeiro)
//   admin   -> acesso total (não vinculado a barbeiro)
//   barber  -> vinculado ao employeeId; vê SOMENTE o próprio agendamento
//
// O employeeId deve bater com o id na tabela public.employees,
// que é registrado no nome do barbeiro (apelido entre parênteses).
export const AUTH_USERS: Record<string, AuthUser> = {
  "phael.techsuporte@gmail.com": {
    email: "phael.techsuporte@gmail.com",
    role: "master",
    employeeId: null,
    name: "Master / Admin Geral",
  },
  "comercial.barberlipe@gmail.com": {
    email: "comercial.barberlipe@gmail.com",
    role: "barber",
    employeeId: null, // preenchido em setup via nome do barbeiro
    name: "Felipe (banha)",
  },
  "comercial.lucasbarber@gmail.com": {
    email: "comercial.lucasbarber@gmail.com",
    role: "barber",
    employeeId: null, // preenchido em setup via nome do barbeiro
    name: "Lucas (Pesado)",
  },
};

export const BARBER_EMAILS = Object.values(AUTH_USERS)
  .filter((u) => u.role === "barber")
  .map((u) => u.email);

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return Object.prototype.hasOwnProperty.call(
    AUTH_USERS,
    email.trim().toLowerCase()
  );
}

export function getUserRole(email?: string | null): UserRole | null {
  if (!email) return null;
  const user = AUTH_USERS[email.trim().toLowerCase()];
  return user ? user.role : null;
}

export function getAuthUser(email?: string | null): AuthUser | null {
  if (!email) return null;
  return AUTH_USERS[email.trim().toLowerCase()] ?? null;
}