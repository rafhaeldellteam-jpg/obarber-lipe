"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { Loading } from "@/components/Loading";
import { PlanCountdown } from "@/components/plan/PlanCountdown";
import { RequestPlanModal } from "@/components/plan/RequestPlanModal";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";
import { FeedbackShowcase } from "@/components/feedback/FeedbackShowcase";
import { formatDateBR, formatPrice, today } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/config";
import type {
  Service,
  Employee,
  Plan,
  Product,
  SubscriptionWithRelations,
  OrderWithRelations,
} from "@/lib/types";
import {
  ScissorsIcon,
  CalendarIcon,
  UserIcon,
  CreditCardIcon,
  HistoryIcon,
  PackageIcon,
  SunIcon,
  MoonIcon,
  LogOutIcon,
  ClockIcon,
  CheckIcon,
  ChevronRightIcon,
  ArrowRightIcon,
} from "@/components/icons";

type MeData = {
  user: { name: string | null; email: string };
  appointments: Array<{
    id: string;
    client_name: string;
    appointment_date: string;
    appointment_time: string;
    status: string;
    services?: { name: string | null } | null;
    employees?: { name: string | null } | null;
  }>;
  subscriptions: SubscriptionWithRelations[];
  orders: OrderWithRelations[];
  customers: Array<{ id: string; name: string; phone: string | null }>;
  plans: Plan[];
  products: Product[];
  employees: Employee[];
  services: Service[];
};

type Slot = { time: string; available: boolean };
type DayInfo = { date: string; slots: Slot[]; availableCount: number };

function statusBadge(status: string) {
  const tones: Record<string, string> = {
    confirmado: "border-emerald-300/40 bg-emerald-300/10 text-emerald-300",
    concluido: "border-sky-300/40 bg-sky-300/10 text-sky-300",
    cancelado: "border-red-300/40 bg-red-300/10 text-red-300",
    pendente: "border-yellow-300/40 bg-yellow-300/10 text-yellow-300",
    ativo: "border-emerald-300/40 bg-emerald-300/10 text-emerald-300",
    aguardando: "border-yellow-300/40 bg-yellow-300/10 text-yellow-300",
    aprovado: "border-emerald-300/40 bg-emerald-300/10 text-emerald-300",
    recusado: "border-red-300/40 bg-red-300/10 text-red-300",
    pausado: "border-yellow-300/40 bg-yellow-300/10 text-yellow-300",
    expirado: "border-zinc-400/40 bg-zinc-400/10 text-zinc-300",
    pago: "border-sky-300/40 bg-sky-300/10 text-sky-300",
  };
  return tones[status] ?? "border-brand-border bg-brand-card text-brand-text";
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadge(status)}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function dayLabel(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const dObj = new Date(y, m - 1, d);
  const names = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  return `${names[dObj.getDay()]}`;
}

type MeTab = "agendamentos" | "dias" | "planos" | "produtos" | "feedbacks";

export default function MePage() {
  const { user, loading, signOut, role } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const [data, setData] = useState<MeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "done">("loading");
  const [tab, setTab] = useState<MeTab>("agendamentos");
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Notificação flutuante some sozinha após 4s
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  // Aba via query param (ex.: /me?tab=feedbacks a partir do e-mail de feedback)
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("tab");
    if (
      param &&
      ["agendamentos", "dias", "planos", "produtos", "feedbacks"].includes(param)
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab(param as MeTab);
    }
  }, []);

  // Aba Dias
  const [dayBarber, setDayBarber] = useState("");
  const [dayService, setDayService] = useState("");
  const [daysData, setDaysData] = useState<DayInfo[]>([]);
  const [daysLoading, setDaysLoading] = useState(false);

  // Aba Planos / Produtos
  const [reqBarber, setReqBarber] = useState("");
  const [planModal, setPlanModal] = useState<{ open: boolean; planId: string }>({
    open: false,
    planId: "",
  });

  const isStaff = role === "barber" || role === "master" || role === "admin";

  const loadMe = useCallback(async () => {
    try {
      const res = await fetch("/api/me");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Erro ao carregar.");
      setData(json.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadState("done");
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    } else if (!loading && user && isStaff) {
      router.replace("/admin");
    } else if (!loading && user && !isStaff) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadMe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, isStaff, router]);

  const loadDays = useCallback(async (employeeId: string) => {
    setDaysLoading(true);
    try {
      const res = await fetch(`/api/me/dias?employee_id=${encodeURIComponent(employeeId)}&days=14`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Erro ao carregar os dias.");
      setDaysData((json.data?.days as DayInfo[]) ?? []);
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setDaysLoading(false);
    }
  }, []);

  const book = async (date: string, time: string) => {
    if (!dayService || !data) return;
    setBusy(true);
    try {
      const customer = data.customers?.find((c) => c.phone) ?? data.customers?.[0];
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: data.user.name ?? data.user.email?.split("@")[0] ?? "Cliente",
          clientPhone: customer?.phone ?? "",
          employeeId: dayBarber,
          serviceId: dayService,
          appointmentDate: date,
          appointmentTime: time,
          notes: "",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Não foi possível agendar.");
      setToast(`Horário agendado para ${formatDateBR(date)} às ${time}!`);
      await loadMe();
      if (dayBarber) await loadDays(dayBarber);
      setTab("agendamentos");
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const requestPlan = async (planId: string, employeeId: string) => {
    if (!employeeId) {
      setToast("Escolha o barbeiro para ativar o plano.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request_plan", plan_id: planId, employee_id: employeeId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Erro ao solicitar.");
      setToast(json.message ?? "Solicitação enviada!");
      setPlanModal({ open: false, planId: "" });
      await loadMe();
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const requestProduct = async (productId: string) => {
    if (!reqBarber) {
      setToast("Escolha o barbeiro para o pedido.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request_product", product_id: productId, employee_id: reqBarber }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Erro ao solicitar.");
      setToast(json.message ?? "Pedido enviado!");
      setReqBarber("");
      await loadMe();
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading || (!user && loadState === "loading")) {
    return (
      <main className="grid min-h-screen place-items-center">
        <Loading />
      </main>
    );
  }

  if (isStaff) return null;

  const upcoming = (data?.appointments ?? [])
    .filter(
      (a) =>
        (a.appointment_date >= today() && a.status !== "cancelado") ||
        (a.appointment_date === today() && a.status !== "concluido" && a.status !== "cancelado")
    )
    .filter((a) => a.status !== "cancelado")
    .sort((a, b) =>
      `${a.appointment_date} ${a.appointment_time}`.localeCompare(
        `${b.appointment_date} ${b.appointment_time}`
      )
    );
  const history = (data?.appointments ?? []).filter(
    (a) => a.status === "concluido" || (a.appointment_date < today() && a.status === "concluido")
  );

  const mySubscriptions = data?.subscriptions ?? [];
  const myOrders = data?.orders ?? [];

  const TAB_STYLES: Record<MeTab, string> = {
    agendamentos: "Agendamentos",
    dias: "Dias",
    planos: "Planos",
    produtos: "Produtos",
    feedbacks: "Feedbacks",
  };

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-brand-border bg-brand-black/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/me" className="flex items-center gap-2">
            <Image
              src="/icon-192.png"
              alt="Obarber Lipe"
              width={36}
              height={36}
              priority
              className="h-9 w-9 rounded-full"
            />
            <div className="leading-tight">
              <div className="text-sm font-black">
                Obarber <span className="text-brand-gold">Lipe</span>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-brand-muted">
                Minha conta
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label="Alternar tema"
              className="grid h-10 w-10 place-items-center rounded-xl border border-brand-border bg-brand-card text-brand-muted transition-colors hover:text-brand-orange btn-focus"
            >
              {theme === "dark" ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>
            <button
              onClick={() => void signOut()}
              className="grid h-10 w-10 place-items-center rounded-xl border border-brand-border text-brand-muted transition-colors hover:text-brand-red btn-focus"
              aria-label="Sair"
            >
              <LogOutIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div>
        <section className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black sm:text-3xl">
                Olá, {data?.user.name ?? data?.user.email?.split("@")[0] ?? "cliente"}!
              </h1>
              <p className="mt-1 text-sm text-brand-muted">{data?.user.email}</p>
            </div>
            <Link
              href="/agendar"
              className="inline-flex items-center gap-2 rounded-xl bg-gold-gradient px-5 py-3 text-sm font-black text-zinc-950 transition-transform hover:scale-[1.02] btn-focus"
            >
              <CalendarIcon className="h-4 w-4" /> Fazer agendamento completo <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>

          {error && (
            <p className="mt-4 rounded-xl border border-brand-red/30 bg-brand-red/10 px-4 py-3 text-sm text-brand-red">
              {error}
            </p>
          )}

          <div className="mt-6 grid grid-cols-3 gap-1 rounded-xl bg-brand-darker p-1 sm:grid-cols-5">
            {(Object.keys(TAB_STYLES) as Array<keyof typeof TAB_STYLES>).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  setToast(null);
                }}
                className={`rounded-lg px-2 py-2.5 text-xs font-bold transition-colors btn-focus sm:text-sm ${
                  tab === t
                    ? "bg-gold-gradient text-zinc-950"
                    : "text-brand-muted hover:text-brand-text"
                }`}
              >
                {TAB_STYLES[t]}
              </button>
            ))}
          </div>

          {/* ============ ABAGENDAMENTOS ============ */}
          {tab === "agendamentos" && (
            <>
              <section className="mt-8">
                <h2 className="flex items-center gap-2 text-lg font-black">
                  <CalendarIcon className="h-5 w-5 text-brand-orange" /> Próximos horários
                </h2>
                {upcoming.length === 0 ? (
                  <p className="mt-3 rounded-2xl border border-dashed border-brand-border p-8 text-center text-sm text-brand-muted">
                    Você não tem horários marcados. Use a aba <strong>Dias</strong> para agendar!
                  </p>
                ) : (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {upcoming.map((a) => (
                      <div key={a.id} className="rounded-2xl border border-brand-border bg-brand-card p-5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-lg font-black text-brand-orange">
                            {formatDateBR(a.appointment_date)}
                          </span>
                          <StatusPill status={a.status} />
                        </div>
                        <div className="mt-1 text-sm text-brand-muted">
                          às {a.appointment_time}
                        </div>
                        <div className="mt-3 space-y-1 text-sm">
                          <p className="flex items-center gap-2">
                            <ScissorsIcon className="h-4 w-4 text-brand-muted" />
                            {a.services?.name ?? "—"}
                          </p>
                          <p className="flex items-center gap-2">
                            <UserIcon className="h-4 w-4 text-brand-muted" />
                            {a.employees?.name ?? "—"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="mt-10">
                <h2 className="flex items-center gap-2 text-lg font-black">
                  <HistoryIcon className="h-5 w-5 text-brand-orange" /> Histórico de cortes
                </h2>
                {history.length === 0 ? (
                  <p className="mt-3 rounded-2xl border border-dashed border-brand-border p-8 text-center text-sm text-brand-muted">
                    Nenhum corte concluído ainda.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {history.map((a) => (
                      <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-border bg-brand-card px-4 py-3 text-sm">
                        <div className="flex items-center gap-3">
                          <CalendarIcon className="h-4 w-4 text-brand-orange" />
                          <span className="font-semibold">{formatDateBR(a.appointment_date)}</span>
                          <span className="text-brand-muted">às {a.appointment_time}</span>
                          <span className="text-brand-muted">·</span>
                          <span>{a.services?.name ?? "—"}</span>
                          <span className="text-brand-muted">· {a.employees?.name ?? "—"}</span>
                        </div>
                        <StatusPill status={a.status} />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {/* ============ DIAS ============ */}
          {tab === "dias" && (
            <section className="mt-8">
              <h2 className="flex items-center gap-2 text-lg font-black">
                <ClockIcon className="h-5 w-5 text-brand-orange" /> Escolha o dia e agende
              </h2>
              <p className="mt-1 text-sm text-brand-muted">
                Selecione o barbeiro, o serviço e o horário. O agendamento entra na agenda do barbeiro escolhido.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-brand-muted">Barbeiro</label>
                  <select
                    value={dayBarber}
                    onChange={(e) => {
                      const id = e.target.value;
                      setDayBarber(id);
                      if (id) void loadDays(id);
                    }}
                    className="w-full rounded-xl border border-brand-border bg-brand-darker px-4 py-3 text-sm text-brand-text btn-focus"
                  >
                    <option value="">Escolha o barbeiro…</option>
                    {(data?.employees ?? []).map((e) => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-brand-muted">Serviço</label>
                  <select
                    value={dayService}
                    onChange={(e) => setDayService(e.target.value)}
                    className="w-full rounded-xl border border-brand-border bg-brand-darker px-4 py-3 text-sm text-brand-text btn-focus"
                  >
                    <option value="">Escolha o serviço…</option>
                    {(data?.services ?? []).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {daysLoading ? (
                <div className="mt-6">
                  <Loading label="Carregando dias…" />
                </div>
              ) : dayBarber ? (
                dayService ? (
                  <div className="mt-6">
                    {daysData.filter((d) => d.availableCount > 0).length === 0 ? (
                      <p className="mt-3 rounded-2xl border border-dashed border-brand-border p-8 text-center text-sm text-brand-muted">
                        Nenhum horário disponível nos próximos dias.
                      </p>
                    ) : (
                      <div className="grid gap-3">
                        {daysData
                          .filter((d) => d.availableCount > 0)
                          .map((d) => (
                            <div key={d.date} className="rounded-2xl border border-brand-border bg-brand-card p-4">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <span className="text-sm font-black text-brand-orange">{dayLabel(d.date)} · {formatDateBR(d.date)}</span>
                                  <span className="ml-2 text-xs text-brand-muted">{d.availableCount} horários</span>
                                </div>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {d.slots
                                  .filter((s) => s.available)
                                  .map((s) => (
                                    <button
                                      key={s.time}
                                      disabled={busy}
                                      onClick={() => void book(d.date, s.time)}
                                      className="rounded-lg border border-brand-border bg-brand-darker px-3 py-1.5 text-xs font-bold text-brand-text transition-colors hover:border-brand-orange hover:text-brand-orange btn-focus disabled:opacity-50"
                                    >
                                      {s.time}
                                    </button>
                                  ))}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-6 text-sm text-brand-muted">Escolha o serviço para ver os horários.</p>
                )
              ) : (
                <p className="mt-6 text-sm text-brand-muted">Escolha o barbeiro para ver os dias disponíveis.</p>
              )}
            </section>
          )}

          {/* ============ PLANOS ============ */}
          {tab === "planos" && (
            <>
              {(() => {
                const active = mySubscriptions.find(
                  (s) => s.status === "ativo" && s.end_date
                );
                if (!active) return null;
                return (
                  <section className="mt-8 overflow-hidden rounded-2xl border border-emerald-400/40 bg-gradient-to-b from-emerald-400/10 to-transparent p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="flex items-center gap-2 text-lg font-black">
                        <CreditCardIcon className="h-5 w-5 text-emerald-400" /> Seu plano está ativo
                      </h2>
                      <StatusPill status="ativo" />
                    </div>
                    <p className="mt-1 text-sm font-bold">
                      {active.plans?.name ?? "Plano"}
                      {active.employees?.name ? (
                        <span className="font-normal text-brand-muted"> · {active.employees.name}</span>
                      ) : null}
                    </p>
                    {active.plans?.cuts_per_period != null && (
                      <p className="mt-2 inline-block rounded-lg border border-brand-border bg-brand-card px-3 py-1.5 text-sm">
                        <span className="font-black text-emerald-400">
                          {Math.max(
                            0,
                            active.plans.cuts_per_period - (active.cuts_used ?? 0)
                          )}
                        </span>{" "}
                        de {active.plans.cuts_per_period} cortes disponíveis
                      </p>
                    )}
                    <div className="mt-4">
                      <PlanCountdown
                        endDate={active.end_date as string}
                        startDate={active.start_date}
                      />
                    </div>
                    <p className="mt-2 text-xs text-brand-muted">
                      Válido até {formatDateBR(active.end_date as string)} · Agende seus cortes normalmente.
                    </p>
                  </section>
                );
              })()}

              <section className="mt-8">
                <h2 className="flex items-center gap-2 text-lg font-black">
                  <CreditCardIcon className="h-5 w-5 text-brand-orange" /> Planos disponíveis
                </h2>
                <p className="mt-1 text-sm text-brand-muted">
                  Escolha o plano e o barbeiro. Ele aprova no painel dele e a contagem começa na hora.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(data?.plans ?? []).map((p) => (
                    <div key={p.id} className="flex flex-col rounded-2xl border border-brand-border bg-brand-card p-5">
                      <span className="font-black">{p.name}</span>
                      <p className="mt-1 flex-1 text-sm text-brand-muted">{p.description}</p>
                      <div className="mt-2 text-xs text-brand-muted">
                        {p.cuts_per_period} cortes / {p.duration_days} dias
                      </div>
                      <p className="mt-2 text-xl font-black text-brand-orange">{formatPrice(p.price)}</p>
                      <button
                        onClick={() => setPlanModal({ open: true, planId: p.id })}
                        disabled={busy}
                        className="mt-3 w-full rounded-lg bg-gold-gradient px-4 py-2.5 text-sm font-black text-zinc-950 btn-focus disabled:opacity-50"
                      >
                        Ativar este plano
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mt-10">
                <h2 className="flex items-center gap-2 text-lg font-black">
                  <CreditCardIcon className="h-5 w-5 text-brand-orange" /> Minhas assinaturas
                </h2>
                {mySubscriptions.length === 0 ? (
                  <p className="mt-3 rounded-2xl border border-dashed border-brand-border p-8 text-center text-sm text-brand-muted">
                    Nenhuma assinatura. Solicite um plano acima!
                  </p>
                ) : (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {mySubscriptions.map((s) => {
                      return (
                        <div key={s.id} className="rounded-2xl border border-brand-border bg-brand-card p-5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-black">{s.plans?.name ?? "Plano"}</span>
                            <StatusPill status={s.status} />
                          </div>
                          <p className="mt-1 text-xs text-brand-muted">
                            {s.employees?.name ? `Barbeiro: ${s.employees.name}` : "Barbeiro: —"}
                          </p>
                          {s.status === "aguardando" && (
                            <p className="mt-3 rounded-lg border border-yellow-300/30 bg-yellow-300/10 px-3 py-2 text-xs text-yellow-300">
                              Aguardando aprovação do barbeiro.
                            </p>
                          )}
                          {s.status === "ativo" && s.start_date && (
                            <div className="mt-3 space-y-2 text-sm">
                              <p className="text-brand-muted">
                                Início {formatDateBR(s.start_date)}
                                {s.end_date ? ` · até ${formatDateBR(s.end_date)}` : ""}
                              </p>
                              {s.plans?.cuts_per_period != null && (
                                <p className="text-xs text-brand-muted">
                                  Cortes usados:{" "}
                                  <span className="font-bold text-brand-text">
                                    {s.cuts_used ?? 0}/{s.plans.cuts_per_period}
                                  </span>
                                </p>
                              )}
                              {s.end_date && (
                                <PlanCountdown
                                  endDate={s.end_date}
                                  startDate={s.start_date}
                                />
                              )}
                            </div>
                          )}
                          {s.plans?.price != null && (
                            <p className="mt-2 text-lg font-black text-brand-orange">{formatPrice(s.plans.price)}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}

          {/* ============ PRODUTOS ============ */}
          {tab === "produtos" && (
            <>
              <section className="mt-8">
                <h2 className="flex items-center gap-2 text-lg font-black">
                  <PackageIcon className="h-5 w-5 text-brand-orange" /> Produtos
                </h2>
                <p className="mt-1 text-sm text-brand-muted">
                  Peça um produto e escolha o barbeiro. Ele aprova o pedido no painel dele.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(data?.products ?? []).map((p) => (
                    <div key={p.id} className="flex flex-col rounded-2xl border border-brand-border bg-brand-card p-5">
                      <span className="font-black">{p.name}</span>
                      <p className="mt-1 flex-1 text-sm text-brand-muted">{p.description}</p>
                      <p className="mt-2 text-xl font-black text-brand-orange">{formatPrice(p.price)}</p>
                      <select
                        value={reqBarber}
                        onChange={(e) => setReqBarber(e.target.value)}
                        className="mt-3 w-full rounded-lg border border-brand-border bg-brand-darker px-3 py-2 text-sm text-brand-text btn-focus"
                      >
                        <option value="">Barbeiro…</option>
                        {(data?.employees ?? []).map((e) => (
                          <option key={e.id} value={e.id}>{e.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => void requestProduct(p.id)}
                        disabled={busy}
                        className="mt-3 w-full rounded-lg bg-gold-gradient px-4 py-2.5 text-sm font-black text-zinc-950 btn-focus disabled:opacity-50"
                      >
                        Pedir produto
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mt-10">
                <h2 className="flex items-center gap-2 text-lg font-black">
                  <PackageIcon className="h-5 w-5 text-brand-orange" /> Meus pedidos
                </h2>
                {myOrders.length === 0 ? (
                  <p className="mt-3 rounded-2xl border border-dashed border-brand-border p-8 text-center text-sm text-brand-muted">
                    Nenhum pedido registrado.
                  </p>
                ) : (
                  <div className="mt-3 overflow-x-auto rounded-2xl border border-brand-border bg-brand-card">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead>
                        <tr className="border-b border-brand-border text-left text-xs uppercase tracking-wider text-brand-muted">
                          <th className="px-4 py-3">Descrição</th>
                          <th className="px-4 py-3">Valor</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myOrders.map((o) => (
                          <tr key={o.id} className="border-b border-brand-border/60 last:border-0">
                            <td className="px-4 py-3 font-medium">{o.description}</td>
                            <td className="px-4 py-3 font-bold text-brand-orange">{formatPrice(o.amount)}</td>
                            <td className="px-4 py-3"><StatusPill status={o.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}

          {/* ============ FEEDBACKS ============ */}
          {tab === "feedbacks" && (
            <div className="mt-8 grid items-start gap-5 lg:grid-cols-[380px_1fr]">
              <FeedbackForm
                onSuccess={(msg) => setToast(msg)}
              />
              <FeedbackShowcase />
            </div>
          )}
        </section>

        <div className="mx-auto max-w-5xl pb-8 pr-4 sm:pr-6">
          <Link
            href="/agendar"
            className="inline-flex items-center gap-1 text-sm font-bold text-brand-orange hover:underline"
          >
            Precisando de um corte agora? <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {planModal.open && (
        <RequestPlanModal
          plans={data?.plans ?? []}
          employees={data?.employees ?? []}
          busy={busy}
          initialPlanId={planModal.planId}
          onClose={() => setPlanModal({ open: false, planId: "" })}
          onSubmit={(planId, employeeId) => void requestPlan(planId, employeeId)}
        />
      )}

      {/* Notificação flutuante (acima de modais) */}
      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] w-full max-w-sm -translate-x-1/2 px-4">
          <p className="animate-fade-in-up flex items-center gap-2 rounded-xl border border-brand-green/40 bg-brand-card px-4 py-3 text-sm font-semibold text-brand-green shadow-2xl">
            <CheckIcon className="h-4 w-4 shrink-0" /> {toast}
          </p>
        </div>
      )}
    </main>
  );
}