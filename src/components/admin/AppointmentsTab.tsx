"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  AppointmentWithRelations,
} from "@/lib/types";
import {
  formatDateBR
} from "@/lib/utils";
import { cn } from "@/lib/utils";


import {
  api,
  Badge,
  TabHeader,
  EmptyState,
  Toast,
  AppointmentCard
} from "./shared";

/* ---------- AGENDAMENTOS ---------- */

export function AppointmentsTab() {
  const [items, setItems] = useState<AppointmentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("abertos");
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async (f: string) => {
    try {
      const status =
        f === "abertos" || f === "todos" ? "" : f;
      const res = await api<AppointmentWithRelations[]>(
        `/api/admin/appointments?status=${status}`
      );
      const data = res.data ?? [];
      setItems(
        f === "abertos"
          ? data.filter((i) => ["pendente", "confirmado"].includes(i.status))
          : data
      );
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(filter);
  }, [filter, load]);

  const changeStatus = async (id: string, status: string) => {
    try {
      await api("/api/admin/appointments", {
        method: "PATCH",
        body: JSON.stringify({ id, status }),
      });
      await load(filter);
    } catch (e) {
      setToast((e as Error).message);
    }
  };

  return (
    <div>
      <TabHeader
        title="Agendamentos"
        subtitle="Confirme, conclua ou cancele horários"
        onRefresh={() => void load(filter)}
      >
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ["abertos", "Em aberto"],
            ["pendente", "Pendentes"],
            ["confirmado", "Confirmados"],
            ["todos", "Todos"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors btn-focus",
                filter === id
                  ? "bg-gold-gradient text-zinc-950"
                  : "border border-brand-border text-brand-gray hover:text-brand-text"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </TabHeader>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      {loading ? (
        <EmptyState text="Carregando…" />
      ) : items.length === 0 ? (
        <EmptyState text="Nada por aqui." />
      ) : (
        <div className="mt-6 grid gap-3">
          {items.map((a) => (
            <AppointmentCard key={a.id} item={a} onChange={changeStatus} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- HISTÓRICO ---------- */

export function HistoryTab() {
  const [items, setItems] = useState<AppointmentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api<AppointmentWithRelations[]>(
        "/api/admin/appointments"
      );
      setItems((res.data ?? []).filter((i) =>
        ["concluido", "cancelado"].includes(i.status)
      ));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => void load(), [load]);

  return (
    <div>
      <TabHeader title="Histórico" subtitle="Agendamentos concluídos e cancelados" />
      {loading ? (
        <EmptyState text="Carregando…" />
      ) : items.length === 0 ? (
        <EmptyState text="Histórico vazio." />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-brand-border bg-brand-card">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-brand-border text-left text-xs uppercase tracking-wider text-brand-gray">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Serviço</th>
                <th className="px-4 py-3">Profissional</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-b border-brand-border/60 last:border-0">
                  <td className="px-4 py-3">
                    {formatDateBR(a.appointment_date)}{" "}
                    <span className="text-brand-gray">· {a.appointment_time}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold">{a.client_name}</td>
                  <td className="px-4 py-3">{a.services?.name ?? "—"}</td>
                  <td className="px-4 py-3">{a.employees?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
