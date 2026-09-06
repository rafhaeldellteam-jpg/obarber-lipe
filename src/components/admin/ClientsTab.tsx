"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  AppointmentWithRelations,
  Customer,
  Plan,
  SubscriptionWithRelations,
  OrderWithRelations
} from "@/lib/types";
import {
  formatDateBR,
  formatPrice,
  today
} from "@/lib/utils";
import { cn } from "@/lib/utils";

import { PlanCountdown } from "@/components/plan/PlanCountdown";
import {
  CalendarIcon,
  SearchIcon,
  CreditCardIcon,
  PackageIcon,
  HistoryIcon
} from "@/components/icons";

import {
  api,
  Badge,
  Label,
  TabHeader,
  EmptyState,
  Toast,
  inputCls,
  ActionBtn
} from "./shared";

/* ---------- CLIENTES ---------- */

export function ClientsTab() {
  const [items, setItems] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });

  const [history, setHistory] = useState<AppointmentWithRelations[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithRelations[]>([]);
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [subForm, setSubForm] = useState({ plan_id: "", start_date: today(), end_date: "" });
  const [orderForm, setOrderForm] = useState({ description: "", amount: "", status: "pendente" });

  const load = useCallback(async (q?: string) => {
    try {
      const res = await api<Customer[]>(
        `/api/admin/customers${q ? `?search=${encodeURIComponent(q)}` : ""}`
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

  const loadPlans = useCallback(async () => {
    try {
      const res = await api<Plan[]>("/api/admin/plans");
      setPlans(res.data ?? []);
    } catch (e) {
      setToast((e as Error).message);
    }
  }, []);

  const loadDetail = useCallback(async (c: Customer) => {
    setDetailLoading(true);
    try {
      const [histRes, subRes, ordRes] = await Promise.all([
        api<AppointmentWithRelations[]>(
          `/api/admin/appointments?${c.email ? `email=${encodeURIComponent(c.email)}` : ""}${
            !c.email && c.phone ? `&phone=${encodeURIComponent(c.phone.replace(/\D/g, ""))}` : ""
          }`
        ),
        api<SubscriptionWithRelations[]>(`/api/admin/subscriptions?customer_id=${c.id}`),
        api<OrderWithRelations[]>(`/api/admin/orders?customer_id=${c.id}`),
      ]);
      setHistory(histRes.data ?? []);
      setSubscriptions(subRes.data ?? []);
      setOrders(ordRes.data ?? []);
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const submitCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) {
      setToast("Informe um nome válido.");
      return;
    }
    try {
      const res = await api<Customer>("/api/admin/customers", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setToast("Cliente cadastrado.");
      setForm({ name: "", phone: "", email: "", notes: "" });
      setShowForm(false);
      await load();
      if (res.data) {
        setSelected(res.data);
        await loadDetail(res.data);
      }
    } catch (e) {
      setToast((e as Error).message);
    }
  };

  const submitSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !subForm.plan_id) return;
    try {
      await api("/api/admin/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          customer_id: selected.id,
          plan_id: subForm.plan_id,
          start_date: subForm.start_date,
          end_date: subForm.end_date || null,
        }),
      });
      setToast("Assinatura criada.");
      setSubForm({ plan_id: "", start_date: today(), end_date: "" });
      await loadDetail(selected);
    } catch (e) {
      setToast((e as Error).message);
    }
  };

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || orderForm.description.trim().length < 2) return;
    try {
      await api("/api/admin/orders", {
        method: "POST",
        body: JSON.stringify({
          customer_id: selected.id,
          description: orderForm.description,
          amount: Number(orderForm.amount) || 0,
          status: orderForm.status,
        }),
      });
      setToast("Pedido registrado.");
      setOrderForm({ description: "", amount: "", status: "pendente" });
      await loadDetail(selected);
    } catch (e) {
      setToast((e as Error).message);
    }
  };

  const setOrderStatus = async (id: string, status: string) => {
    try {
      await api("/api/admin/orders", { method: "PATCH", body: JSON.stringify({ id, status }) });
      if (selected) await loadDetail(selected);
    } catch (e) {
      setToast((e as Error).message);
    }
  };

  const setSubStatus = async (id: string, status: string) => {
    try {
      await api("/api/admin/subscriptions", {
        method: "PATCH",
        body: JSON.stringify({ id, status }),
      });
      if (selected) await loadDetail(selected);
    } catch (e) {
      setToast((e as Error).message);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (selected) void loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Lista / busca */}
      <div>
        <TabHeader title="Clientes" subtitle="Busque, cadastre e atenda seus clientes.">
          <div className="relative mt-3">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-gray" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                void load(e.target.value);
              }}
              placeholder="Buscar por nome ou telefone…"
              className="rounded-lg border border-brand-border bg-brand-darker py-2.5 pl-10 pr-4 text-sm text-brand-text placeholder:text-brand-gray/60 btn-focus"
            />
          </div>
        </TabHeader>

        <button
          onClick={() => setShowForm((v) => !v)}
          className="mt-3 w-full rounded-lg bg-gold-gradient px-4 py-2.5 text-sm font-black text-zinc-950 btn-focus"
        >
          {showForm ? "Fechar" : "+ Novo cliente"}
        </button>

        {showForm && (
          <form onSubmit={submitCustomer} className="mt-3 space-y-3 rounded-2xl border border-brand-border bg-brand-card p-4 animate-fade-in">
            <div>
              <Label>Nome *</Label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Nome do cliente" />
            </div>
            <div>
              <Label>Telefone</Label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="(11) 99999-9999" />
            </div>
            <div>
              <Label>E-mail</Label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="cliente@email.com" />
            </div>
            <div>
              <Label>Observações</Label>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} placeholder="Preferências, restrições…" />
            </div>
            <button type="submit" className="w-full rounded-lg bg-gold-gradient px-4 py-2.5 text-sm font-black text-zinc-950 btn-focus">
              Cadastrar cliente
            </button>
          </form>
        )}

        <div className="mt-4 space-y-2">
          {loading ? (
            <EmptyState text="Carregando…" />
          ) : items.length === 0 ? (
            <EmptyState text="Nenhum cliente encontrado." />
          ) : (
            items.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelected(c);
                  void loadDetail(c);
                }}
                className={cn(
                  "w-full rounded-xl border px-4 py-3 text-left transition-colors btn-focus",
                  selected?.id === c.id
                    ? "border-brand-gold bg-brand-gold/10"
                    : "border-brand-border bg-brand-card hover:border-brand-gold/40"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-orange/15 font-bold text-brand-orange">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold">{c.name}</span>
                      {c.signup_method === "google" ? (
                        <span className="rounded-full border border-brand-orange/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-orange">
                          Google
                        </span>
                      ) : (
                        <span className="rounded-full border border-brand-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-gray">
                          E-mail
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-brand-gray">{c.phone || c.email || "—"}</div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detalhe do cliente */}
      <div>
        {!selected ? (
          <div className="mt-8 rounded-2xl border border-dashed border-brand-border p-10 text-center text-sm text-brand-gray">
            Selecione um cliente para ver histórico, pedidos e assinaturas.
          </div>
        ) : detailLoading ? (
          <EmptyState text="Carregando dados do cliente…" />
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border border-brand-border bg-brand-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-orange/15 text-lg font-black text-brand-orange">
                    {selected.name.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <h3 className="text-lg font-black">{selected.name}</h3>
                    <p className="text-sm text-brand-gray">
                      {[selected.phone, selected.email].filter(Boolean).join(" · ") || "Sem contato"}
                    </p>
                  </div>
                </div>
                <Badge status="confirmado" />
              </div>
              {selected.notes && (
                <p className="mt-3 rounded-xl bg-brand-darker px-3 py-2 text-sm text-brand-gray">
                  {selected.notes}
                </p>
              )}

              {/* Assinatura */}
              <div className="mt-5">
                <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-brand-gray">
                  <CreditCardIcon className="h-4 w-4" /> Assinar plano
                </h4>
                <form onSubmit={submitSubscription} className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
                  <select
                    value={subForm.plan_id}
                    onChange={(e) => setSubForm({ ...subForm, plan_id: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">Selecione o plano…</option>
                    {plans
                      .filter((p) => p.active)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {formatPrice(p.price)}
                        </option>
                      ))}
                  </select>
                  <input type="date" value={subForm.start_date} onChange={(e) => setSubForm({ ...subForm, start_date: e.target.value })} className={inputCls} />
                  <input type="date" value={subForm.end_date} onChange={(e) => setSubForm({ ...subForm, end_date: e.target.value })} className={inputCls} />
                  <button type="submit" className="rounded-lg bg-gold-gradient px-4 py-2.5 text-sm font-black text-zinc-950 btn-focus">
                    Assinar
                  </button>
                </form>
              </div>

              {/* Pedido */}
              <div className="mt-4">
                <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-brand-gray">
                  <PackageIcon className="h-4 w-4" /> Registrar pedido
                </h4>
                <form onSubmit={submitOrder} className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
                  <input
                    value={orderForm.description}
                    onChange={(e) => setOrderForm({ ...orderForm, description: e.target.value })}
                    className={inputCls}
                    placeholder="Ex.: Pomada, balm, 2º corte…"
                  />
                  <input
                    inputMode="decimal"
                    value={orderForm.amount}
                    onChange={(e) => setOrderForm({ ...orderForm, amount: e.target.value })}
                    className={inputCls}
                    placeholder="Valor R$"
                  />
                  <select
                    value={orderForm.status}
                    onChange={(e) => setOrderForm({ ...orderForm, status: e.target.value })}
                    className={inputCls}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="pago">Pago</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                  <button type="submit" className="rounded-lg bg-gold-gradient px-4 py-2.5 text-sm font-black text-zinc-950 btn-focus">
                    Registrar
                  </button>
                </form>
              </div>
            </div>

            {/* Histórico de cortes */}
            <div className="rounded-2xl border border-brand-border bg-brand-card p-5">
              <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-brand-gray">
                <HistoryIcon className="h-4 w-4" /> Histórico de cortes
              </h4>
              {history.length === 0 ? (
                <EmptyState text="Nenhum corte registrado ainda." />
              ) : (
                <div className="mt-3 space-y-2">
                  {history.map((a) => (
                    <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-border bg-brand-darker px-4 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        <CalendarIcon className="h-4 w-4 text-brand-orange" />
                        <span className="font-semibold">{formatDateBR(a.appointment_date)}</span>
                        <span className="text-brand-gray">às {a.appointment_time}</span>
                        <span className="text-brand-gray">·</span>
                        <span>{a.services?.name ?? "—"}</span>
                        <span className="text-brand-gray">· {a.employees?.name ?? "—"}</span>
                      </div>
                      <Badge status={a.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assinaturas */}
            <div className="rounded-2xl border border-brand-border bg-brand-card p-5">
              <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-brand-gray">
                <CreditCardIcon className="h-4 w-4" /> Assinaturas de planos
              </h4>
              {subscriptions.length === 0 ? (
                <EmptyState text="Nenhuma assinatura." />
              ) : (
                <div className="mt-3 space-y-2">
                  {subscriptions.map((s) => (
                    <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-border bg-brand-darker px-4 py-3 text-sm">
                      <div>
                        <div className="font-semibold">
                          {s.plans?.name ?? "Plano removido"}
                          {s.customers?.name ? (
                            <span className="text-brand-gray"> · {s.customers.name}</span>
                          ) : null}
                        </div>
                        <div className="text-xs text-brand-gray">
                          {s.start_date ? `Início ${formatDateBR(s.start_date)}` : "Aguardando aprovação"}
                          {s.end_date ? ` · até ${formatDateBR(s.end_date)}` : ""}
                          {s.plans ? ` · ${formatPrice(s.plans.price)}` : ""}
                          {s.status === "ativo" && s.plans?.cuts_per_period != null
                            ? ` · ${s.cuts_used ?? 0}/${s.plans.cuts_per_period} cortes usados`
                            : ""}
                        </div>
                        {s.status === "ativo" && s.end_date && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-gray">
                              Expira em
                            </span>
                            <PlanCountdown endDate={s.end_date} compact />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge status={s.status} />
                        {s.status === "aguardando" && (
                          <>
                            <ActionBtn label="Aprovar" onClick={() => void setSubStatus(s.id, "ativo")} tone="green" />
                            <ActionBtn label="Recusar" onClick={() => void setSubStatus(s.id, "recusado")} tone="red" />
                          </>
                        )}
                        {s.status === "ativo" && (
                          <ActionBtn label="Pausar" onClick={() => void setSubStatus(s.id, "pausado")} tone="gold" />
                        )}
                        {s.status === "pausado" && (
                          <ActionBtn label="Ativar" onClick={() => void setSubStatus(s.id, "ativo")} tone="green" />
                        )}
                        {s.status !== "cancelado" && s.status !== "recusado" && (
                          <ActionBtn label="Cancelar" onClick={() => void setSubStatus(s.id, "cancelado")} tone="red" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pedidos */}
            <div className="rounded-2xl border border-brand-border bg-brand-card p-5">
              <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-brand-gray">
                <PackageIcon className="h-4 w-4" /> Pedidos
              </h4>
              {orders.length === 0 ? (
                <EmptyState text="Nenhum pedido registrado." />
              ) : (
                <div className="mt-3 space-y-2">
                  {orders.map((o) => (
                    <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-border bg-brand-darker px-4 py-3 text-sm">
                      <div>
                        <div className="font-semibold">{o.description}</div>
                        <div className="text-xs text-brand-gray">{formatDateBR(o.created_at?.slice(0, 10))}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-brand-gold">{formatPrice(o.amount)}</span>
                        <Badge status={o.status} />
                        {o.status === "aguardando" && (
                          <>
                            <ActionBtn label="Aprovar" onClick={() => void setOrderStatus(o.id, "aprovado")} tone="green" />
                            <ActionBtn label="Recusar" onClick={() => void setOrderStatus(o.id, "recusado")} tone="red" />
                          </>
                        )}
                        {o.status === "aprovado" && (
                          <ActionBtn label="Pago" onClick={() => void setOrderStatus(o.id, "pago")} tone="green" />
                        )}
                        {o.status !== "cancelado" && o.status !== "recusado" && o.status !== "pago" && (
                          <ActionBtn label="Cancelar" onClick={() => void setOrderStatus(o.id, "cancelado")} tone="red" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

