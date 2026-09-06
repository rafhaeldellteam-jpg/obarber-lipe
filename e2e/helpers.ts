import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env: Record<string, string> = {};
for (const line of readFileSync(".env.development.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)="?(.*?)"?$/);
  if (m) env[m[1]] = m[2];
}

function adminClient() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const TEST_USER = {
  email: "e2e-test@exemplo.com",
  password: "TesteE2E123",
  name: "Cliente E2E",
};

export async function setup() {
  const supabase = adminClient();

  // Idempotente: remove resquícios de execuções anteriores antes de criar
  const { data: list } = await supabase.auth.admin.listUsers();
  for (const u of list.users.filter((x) => x.email === TEST_USER.email)) {
    const { data: customers } = await supabase
      .from("customers")
      .select("id")
      .eq("email", TEST_USER.email);
    for (const c of customers ?? []) {
      await supabase.from("customer_subscriptions").delete().eq("customer_id", c.id);
    }
    await supabase.from("customers").delete().eq("email", TEST_USER.email);
    await supabase.auth.admin.deleteUser(u.id);
  }

  const { error } = await supabase.auth.admin.createUser({
    email: TEST_USER.email,
    password: TEST_USER.password,
    email_confirm: true,
    user_metadata: { name: TEST_USER.name, phone: "11988887777" },
  });
  if (error) throw new Error("global-setup falhou: " + error.message);
  console.log("[e2e] usuário de teste criado:", TEST_USER.email);
}

export async function teardown() {
  const supabase = adminClient();
  const { data: list } = await supabase.auth.admin.listUsers();
  for (const u of list.users.filter((x) => x.email === TEST_USER.email)) {
    const { data: customers } = await supabase
      .from("customers")
      .select("id")
      .eq("email", TEST_USER.email);
    for (const c of customers ?? []) {
      await supabase.from("customer_subscriptions").delete().eq("customer_id", c.id);
    }
    await supabase.from("customers").delete().eq("email", TEST_USER.email);
    await supabase.auth.admin.deleteUser(u.id);
  }
  console.log("[e2e] usuário de teste removido");
}
