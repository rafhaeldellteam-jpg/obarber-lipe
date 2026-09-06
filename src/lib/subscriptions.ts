import { supabaseAdmin } from "@/lib/supabase";

/**
 * Expiração automática: vira para "expirado" toda assinatura
 * ativa cujo end_date já passou. Idempotente e barato — pode ser
 * chamada a qualquer momento antes de listar assinaturas.
 */
export async function expireOverdueSubscriptions(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabaseAdmin
    .from("customer_subscriptions")
    .update({ status: "expirado" })
    .eq("status", "ativo")
    .lt("end_date", today);
  if (error) {
    console.warn("[subscriptions] Falha ao expirar planos:", error.message);
  }
}

/**
 * Débito de corte: ao concluir um atendimento, debita 1 corte da
 * assinatura ativa do cliente (preferindo a do próprio barbeiro).
 * Melhor esforço: se a coluna cuts_used ainda não existir no banco
 * (schema antigo) ou não houver plano válido, não falha.
 */
export async function debitPlanCutForAppointment(params: {
  clientEmail: string;
  employeeId: string | null;
}): Promise<void> {
  const { clientEmail, employeeId } = params;

  // Localiza o cliente pelo e-mail do agendamento
  const { data: customers } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("email", clientEmail);
  const customerIds = (customers ?? []).map((c) => c.id);
  if (customerIds.length === 0) return;

  // Assinatura ativa dentro da validade (preferência: mesmo barbeiro)
  const today = new Date().toISOString().slice(0, 10);
  type ActiveSub = {
    id: string;
    employee_id: string | null;
    cuts_used: number | null;
    plans: { cuts_per_period: number } | null;
  };
  const subRes = await supabaseAdmin
    .from("customer_subscriptions")
    .select("id, employee_id, cuts_used, plans(cuts_per_period)")
    .eq("status", "ativo")
    .in("customer_id", customerIds)
    .gte("end_date", today);
  if (subRes.error) {
    // Schema antigo sem cuts_used: sem débito possível
    console.warn("[subscriptions] cuts_used indisponível:", subRes.error.message);
    return;
  }
  const subs = (subRes.data ?? []) as unknown as ActiveSub[];
  if (subs.length === 0) return;

  const sub =
    (employeeId ? subs.find((s) => s.employee_id === employeeId) : undefined) ??
    subs[0];
  if (!sub) return;

  const maxCuts = sub.plans?.cuts_per_period ?? null;
  if (maxCuts == null) return;
  const used = sub.cuts_used ?? 0;
  if (used >= maxCuts) return; // plano esgotado: não debita

  // Incremento otimista: só atualiza se cuts_used ainda for o lido
  const { error: updError } = await supabaseAdmin
    .from("customer_subscriptions")
    .update({ cuts_used: used + 1 })
    .eq("id", sub.id)
    .eq("cuts_used", used);
  if (updError) {
    console.warn("[subscriptions] Falha ao debitar corte:", updError.message);
  }
}
