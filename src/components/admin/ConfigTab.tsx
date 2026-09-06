"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/lib/AuthContext";
import type {
  Employee,
} from "@/lib/types";

import {
  CalendarIcon
} from "@/components/icons";

import {
  api,
  Label,
  TabHeader,
  EmptyState,
  Toast,
  inputCls,
  ActionBtn
} from "./shared";

/* ---------- CONFIGURAÇÕES ---------- */

export function ConfigTab() {
  const { role } = useAuth();
  const isBarber = role === "barber";
  const [form, setForm] = useState({ working_hours_start: "09:00", working_hours_end: "19:00", interval_minutes: "30" });
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [calStatus, setCalStatus] = useState<Record<string, { connected: boolean; google_email: string | null; configured: boolean }>>({});
  const [calLoading, setCalLoading] = useState(false);
  const [credsForm, setCredsForm] = useState<Record<string, { google_client_id: string; google_client_secret: string }>>({});
  const [savingCreds, setSavingCreds] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const res = await api<Record<string, string>>("/api/admin/settings");
      if (res.data) {
        setForm({
          working_hours_start: res.data.working_hours_start ?? "09:00",
          working_hours_end: res.data.working_hours_end ?? "19:00",
          interval_minutes: res.data.interval_minutes ?? "30",
        });
      }
    } catch {
      // ignora
    }
  }, []);

  const loadCal = useCallback(async () => {
    setCalLoading(true);
    try {
      if (isBarber) {
        // Barbeiro conecta a PRÓPRIA agenda
        const res = await api<{ connected?: boolean; google_email?: string | null; configured?: boolean }>("/api/calendar/status");
        setEmployees([]);
        setCalStatus({
          self: {
            connected: Boolean(res.data?.connected),
            google_email: res.data?.google_email ?? null,
            configured: Boolean(res.data?.configured),
          },
        });
      } else {
        const empRes = await api<Employee[]>("/api/admin/employees");
        const employeesList = empRes.data ?? [];
        setEmployees(employeesList);
        const statuses: Record<string, { connected: boolean; google_email: string | null; configured: boolean }> = {};
        for (const e of employeesList) {
          try {
            const res = await api<Record<string, unknown>>(`/api/calendar/status?employee_id=${e.id}`);
            statuses[e.id] = {
              connected: Boolean(res.data?.connected),
              google_email: (res.data?.google_email as string | null) ?? null,
              configured: Boolean(res.data?.configured),
            };
          } catch {
            statuses[e.id] = { connected: false, google_email: null, configured: true };
          }
        }
        setCalStatus(statuses);
      }
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setCalLoading(false);
    }
  }, [isBarber]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (!isBarber) void loadSettings(); void loadCal(); }, [isBarber, loadSettings, loadCal]);

  const connectCalendar = async (employeeId?: string) => {
    try {
      const res = await api<{ authUrl?: string }>(
        `/api/calendar/connect${employeeId ? `?employee_id=${employeeId}` : ""}`
      );
      if (res.data?.authUrl) {
        window.location.assign(res.data.authUrl);
      } else {
        setToast("Não foi possível iniciar a conexão. Verifique o Client ID/Secret do barbeiro.");
      }
    } catch (e) {
      setToast((e as Error).message);
    }
  };

  const disconnectCalendar = async (employeeId?: string) => {
    if (!window.confirm("Desconectar o Google Agenda?")) return;
    try {
      await fetch(`/api/calendar/status${employeeId ? `?employee_id=${employeeId}` : ""}`, { method: "DELETE" });
      setToast("Google Agenda desconectado.");
      await loadCal();
    } catch (e) {
      setToast((e as Error).message);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          working_hours_start: form.working_hours_start,
          working_hours_end: form.working_hours_end,
          interval_minutes: form.interval_minutes,
        }),
      });
      setToast("Configurações salvas!");
    } catch (err) {
      setToast((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const saveCreds = async (emp: Employee) => {
    const creds = credsForm[emp.id];
    if (!creds) return;
    setSavingCreds(emp.id);
    try {
      await api("/api/admin/employees", {
        method: "PATCH",
        body: JSON.stringify({
          id: emp.id,
          google_client_id: creds.google_client_id.trim() || null,
          google_client_secret: creds.google_client_secret.trim() || null,
        }),
      });
      setToast("Credenciais do Google salvas!");
      await loadCal();
    } catch (err) {
      setToast((err as Error).message);
    } finally {
      setSavingCreds(null);
    }
  };

  return (
    <div className="space-y-8">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Google Agenda */}
      <div>
        <TabHeader
          title="Google Agenda"
          subtitle={
            isBarber
              ? "Conecte sua conta Google para sincronizar seus agendamentos"
              : "Cada barbeiro conecta a própria conta; os agendamentos sincronizam com o calendário dele"
          }
          onRefresh={() => void loadCal()}
        />
        {calLoading ? (
          <EmptyState text="Carregando vínculos…" />
        ) : isBarber ? (
          (() => {
            const st = calStatus.self;
            return (
              <div className="mt-3 max-w-xl rounded-xl border border-brand-border bg-brand-card px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-orange/15 text-brand-orange">
                      <CalendarIcon className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="font-semibold">Minha conta Google</div>
                      {st ? (
                        st.connected ? (
                          <div className="text-xs text-emerald-300">Conectado: {st.google_email ?? "Google"}</div>
                        ) : (
                          <div className="text-xs text-brand-gray">
                            {st.configured ? "Não conectado" : "Google Agenda não configurado"}
                          </div>
                        )
                      ) : (
                        <div className="text-xs text-brand-gray">Verificando…</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {st?.connected ? (
                      <ActionBtn label="Desconectar" onClick={() => void disconnectCalendar()} tone="red" />
                    ) : (
                      <ActionBtn label="Conectar Google" onClick={() => void connectCalendar()} tone="gold" />
                    )}
                  </div>
                </div>
                <p className="mt-3 text-xs text-brand-gray">
                  Ao autorizar, seus agendamentos passam a aparecer no seu Google Agenda.
                  Cada barbeiro tem o próprio calendário — as agendas não se misturam.
                </p>
              </div>
            );
          })()
        ) : employees.length === 0 ? (
          <EmptyState text="Nenhum funcionário cadastrado." />
        ) : (
          <div className="mt-3 space-y-2">
            {employees.map((emp) => {
              const st = calStatus[emp.id];
              const creds = credsForm[emp.id] ?? {
                google_client_id: emp.google_client_id ?? "",
                google_client_secret: emp.google_client_secret ?? "",
              };
              return (
                <div key={emp.id} className="rounded-xl border border-brand-border bg-brand-card px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-orange/15 text-brand-orange">
                        <CalendarIcon className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="font-semibold">{emp.name}</div>
                        {st?.connected ? (
                          <div className="text-xs text-emerald-300">Conectado: {st.google_email ?? "Google"}</div>
                        ) : (
                          <div className="text-xs text-brand-gray">
                            {st?.configured ? "Não conectado" : "Google Agenda não configurado"}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {st?.connected ? (
                        <ActionBtn label="Desconectar" onClick={() => void disconnectCalendar(emp.id)} tone="red" />
                      ) : (
                        <ActionBtn label="Conectar Google" onClick={() => void connectCalendar(emp.id)} tone="gold" />
                      )}
                    </div>
                  </div>

                  {!st?.configured && (
                    <div className="mt-3 grid gap-2 border-t border-brand-border pt-3 sm:grid-cols-[1fr_1fr_auto]">
                      <div>
                        <Label>Client ID do Google</Label>
                        <input
                          value={creds.google_client_id}
                          placeholder="...apps.googleusercontent.com"
                          onChange={(e) =>
                            setCredsForm((p) => ({
                              ...p,
                              [emp.id]: { ...creds, google_client_id: e.target.value },
                            }))
                          }
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <Label>Client Secret</Label>
                        <input
                          value={creds.google_client_secret}
                          placeholder="GOCSPX-..."
                          onChange={(e) =>
                            setCredsForm((p) => ({
                              ...p,
                              [emp.id]: { ...creds, google_client_secret: e.target.value },
                            }))
                          }
                          className={inputCls}
                        />
                      </div>
                      <button
                        onClick={() => void saveCreds(emp)}
                        disabled={savingCreds === emp.id}
                        className="mt-auto rounded-lg bg-gold-gradient px-4 py-2.5 text-xs font-black text-zinc-950 btn-focus disabled:opacity-50 sm:py-3"
                      >
                        {savingCreds === emp.id ? "Salvando…" : "Salvar"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            <p className="mt-4 text-xs text-brand-gray">
              Cada barbeiro usa o próprio app OAuth criado no Google Cloud (Client ID + Secret).
              A sincronização cria/atualiza o evento no calendário dele ao agendar, e remove ao cancelar —
              as agendas não se misturam.
            </p>
          </div>
        )}
      </div>

      {!isBarber && (
        <div>
          <TabHeader title="Horário de funcionamento" subtitle="Usado para calcular os horários disponíveis no agendamento" />
          <form onSubmit={save} className="mt-6 max-w-md rounded-2xl border border-brand-border bg-brand-card p-5">
            <div className="space-y-4">
              <div>
                <Label>Início do expediente</Label>
                <input type="time" value={form.working_hours_start} onChange={(e) => setForm({ ...form, working_hours_start: e.target.value })} className={inputCls} />
              </div>
              <div>
                <Label>Fim do expediente</Label>
                <input type="time" value={form.working_hours_end} onChange={(e) => setForm({ ...form, working_hours_end: e.target.value })} className={inputCls} />
              </div>
              <div>
                <Label>Intervalo entre horários (min)</Label>
                <select value={form.interval_minutes} onChange={(e) => setForm({ ...form, interval_minutes: e.target.value })} className={inputCls}>
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="60">60 min</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-5 w-full rounded-lg bg-gold-gradient px-4 py-3 text-sm font-black text-zinc-950 btn-focus disabled:opacity-50"
            >
              {saving ? "Salvando…" : "Salvar configurações"}
            </button>
          </form>
          <p className="mt-4 max-w-md text-xs leading-relaxed text-brand-gray">
            Dica: para fechar a barbearia em um dia, use a aba <strong>Bloqueios</strong> marcando
            a data sem preencher horário.
          </p>
        </div>
      )}
    </div>
  );
}

