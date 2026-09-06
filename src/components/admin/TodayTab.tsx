"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  AppointmentWithRelations,
  SubscriptionWithRelations
} from "@/lib/types";
import {
  formatDateBR,
  formatPrice,
  today
} from "@/lib/utils";

import { PlanCountdown } from "@/components/plan/PlanCountdown";
import {
  CreditCardIcon
} from "@/components/icons";

import {
  api,
  Badge,
  TabHeader,
  EmptyState,
  Toast,
  ActionBtn,
  AppointmentCard,
  PATCHData
} from "./shared";


/* ---------- HOJE ---------- */

/* Solicitações de planos aguardando aprovação — destaque na aba Hoje */
function PendingPlanRequests() {
  const [items, setItems] = useState<SubscriptionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<SubscriptionWithRelations[]>(
        "/api/admin/subscriptions?status=aguardando"
      );
      setItems(res.data ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => void load(), [load]);

  const decide = async (id: string, status: "ativo" | "recusado") => {
    try {
      await api("/api/admin/subscriptions", {
        method: "PATCH",
        body: JSON.stringify({ id, status }),
      });
      await load();
    } catch (e) {
      setToast((e as Error).message);
    }
  };

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl border border-brand-gold/40 bg-brand-gold/5 p-5">
      <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-brand-orange">
        <CreditCardIcon className="h-4 w-4" />
        Solicitações de planos ({items.length})
      </h4>
      <p className="mt-1 text-xs text-brand-gray">
        Clientes que pediram ativação com você. Ao aprovar, a contagem do plano começa na hora.
      </p>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <div className="mt-3 space-y-2">
        {items.map((s) => (
          <div
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-border bg-brand-card px-4 py-3 text-sm"
          >
            <div>
              <div className="font-semibold">
                {s.customers?.name ?? "Cliente"} · {s.plans?.name ?? "Plano"}
              </div>
              <div className="text-xs text-brand-gray">
                Solicitado em {formatDateBR(s.requested_at?.slice(0, 10) ?? "")}
                {s.plans ? ` · ${formatPrice(s.plans.price)}` : ""}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ActionBtn
                label="Aprovar"
                onClick={() => void decide(s.id, "ativo")}
                tone="green"
              />
              <ActionBtn
                label="Recusar"
                onClick={() => void decide(s.id, "recusado")}
                tone="red"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivePlanList() {
  const [items, setItems] = useState<SubscriptionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api<SubscriptionWithRelations[]>(
        "/api/admin/subscriptions?status=ativo"
      );
      setItems(res.data ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => void load(), [load]);

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-5">
      <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-emerald-300">
        <CreditCardIcon className="h-4 w-4" />
        Planos ativos ({items.length})
      </h4>
      <p className="mt-1 text-xs text-brand-gray">
        Assinaturas em vigor com o tempo restante de cada plano em tempo real.
      </p>
      <div className="mt-3 space-y-2">
        {items.map((s) => (
          <div
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-border bg-brand-card px-4 py-3 text-sm"
          >
            <div>
              <div className="font-semibold">
                {s.customers?.name ?? "Cliente"} · {s.plans?.name ?? "Plano"}
              </div>
              <div className="text-xs text-brand-gray">
                {s.start_date ? `Início ${formatDateBR(s.start_date)}` : ""}
                {s.end_date ? ` · até ${formatDateBR(s.end_date)}` : ""}
                {s.plans ? ` · ${formatPrice(s.plans.price)}` : ""}
                {s.plans?.cuts_per_period != null
                  ? ` · ${s.cuts_used ?? 0}/${s.plans.cuts_per_period} cortes usados`
                  : ""}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {s.end_date ? (
                <PlanCountdown endDate={s.end_date} compact />
              ) : (
                <span className="text-xs text-brand-gray">Sem prazo</span>
              )}
              <Badge status={s.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TodayTab() {
  const [items, setItems] = useState<AppointmentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<AppointmentWithRelations[]>(
        `/api/admin/appointments?date=${today()}`
      );
      setItems(res.data ?? []);
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => void load(), [load]);

  const changeStatus = async (id: string, status: string) => {
    try {
      await api<PATCHData>("/api/admin/appointments", {
        method: "PATCH",
        body: JSON.stringify({ id, status }),
      });
      await load();
    } catch (e) {
      setToast((e as Error).message);
    }
  };

  const sorted = [...items].sort((a, b) =>
    a.appointment_time.localeCompare(b.appointment_time)
  );

  return (
    <div>
      <TabHeader
        title="Agenda de hoje"
        subtitle={`${formatDateBR(today())} · ${items.length} agendamento(s)`}
        onRefresh={() => void load()}
      />
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <PendingPlanRequests />
      <ActivePlanList />
      {loading ? (
        <EmptyState text="Carregando…" />
      ) : sorted.length === 0 ? (
        <EmptyState text="Nenhum agendamento para hoje." />
      ) : (
        <div className="mt-6 grid gap-3">
          {sorted.map((a) => (
            <AppointmentCard key={a.id} item={a} onChange={changeStatus} />
          ))}
        </div>
      )}
    </div>
  );
}

