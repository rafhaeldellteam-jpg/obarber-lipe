"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import type {
  AppointmentWithRelations,
  Service,
  Employee,
  BlockedSlot,
  Customer,
  Plan,
  Product,
  SubscriptionWithRelations,
  OrderWithRelations,
} from "@/lib/types";
import {
  formatDateBR,
  formatPrice,
  today,
  unmaskPhone,
} from "@/lib/utils";
import { buildWhatsAppLink, statusWhatsAppMessage } from "@/lib/whatsapp";
import { STATUS_LABELS } from "@/lib/config";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  BarberPoleIcon,
  UserIcon,
  PhoneIcon,
  NotesIcon,
  BanIcon,
  CloseIcon,
  SearchIcon,
  CreditCardIcon,
  PackageIcon,
  HistoryIcon,
} from "@/components/icons";

type Tab =
  | "hoje"
  | "agendamentos"
  | "historico"
  | "clientes"
  | "servicos"
  | "funcionarios"
  | "bloqueios"
  | "produtos"
  | "config";

const TABS: { id: Tab; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "agendamentos", label: "Agendamentos" },
  { id: "historico", label: "Histórico" },
  { id: "clientes", label: "Clientes" },
  { id: "servicos", label: "Serviços" },
  { id: "funcionarios", label: "Funcionários" },
  { id: "bloqueios", label: "Bloqueios" },
  { id: "produtos", label: "Produtos" },
  { id: "config", label: "Configurações" },
];

// Abas restritas a master/admin (gestão do catálogo e equipe)
const MANAGER_ONLY_TABS: Tab[] = ["servicos", "funcionarios"];

async function api<T = unknown>(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = await res.json().catch(() => ({ ok: false }));
  if (!res.ok) throw new Error(json.message || "Erro na requisição.");
  return json as { ok: boolean; data?: T; message?: string };
}

const statusColor: Record<string, string> = {
  pendente: "text-yellow-300 border-yellow-300/30 bg-yellow-300/10",
  confirmado: "text-emerald-300 border-emerald-300/30 bg-emerald-300/10",
  concluido: "text-sky-300 border-sky-300/30 bg-sky-300/10",
  cancelado: "text-red-300 border-red-300/30 bg-red-300/10",
  aguardando: "text-yellow-300 border-yellow-300/30 bg-yellow-300/10",
  aprovado: "text-emerald-300 border-emerald-300/30 bg-emerald-300/10",
  recusado: "text-red-300 border-red-300/30 bg-red-300/10",
  ativo: "text-emerald-300 border-emerald-300/30 bg-emerald-300/10",
  pausado: "text-yellow-300 border-yellow-300/30 bg-yellow-300/10",
  expirado: "text-zinc-300 border-zinc-300/30 bg-zinc-300/10",
  pago: "text-sky-300 border-sky-300/30 bg-sky-300/10",
};

function Badge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        statusColor[status] ?? "text-brand-gray border-brand-border bg-brand-card"
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export default function AdminPage() {
  const { user, isAdmin, loading, signOut, role } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("hoje");

  const isBarber = role === "barber";
  const visibleTabs = isBarber
    ? TABS.filter((t) => !MANAGER_ONLY_TABS.includes(t.id))
    : TABS;

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.replace("/");
    }
  }, [loading, user, isAdmin, router]);

  const currentTab =
    isBarber && MANAGER_ONLY_TABS.includes(tab) ? "hoje" : tab;

  if (loading || !user || !isAdmin) {
    return (
      <main className="grid min-h-screen place-items-center bg-brand-black">
        <div className="text-sm text-brand-gray">Carregando…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-black">
      <header className="sticky top-0 z-40 border-b border-brand-border bg-brand-black/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-gold-gradient text-lg font-black text-zinc-950">
              L
            </span>
            <div className="leading-tight">
              <div className="text-sm font-black">
                Obarber <span className="text-brand-gold">Lipe</span>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-brand-gray">
                {isBarber ? "Painel do barbeiro" : "Painel admin"}
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-brand-gray sm:block">
              {user.email}
            </span>
            <button
              onClick={() => void signOut()}
              className="rounded-lg border border-brand-border px-4 py-2 text-sm font-semibold text-brand-gray transition-colors hover:text-brand-text btn-focus"
            >
              Sair
            </button>
          </div>
        </div>
        <nav className="mx-auto max-w-6xl overflow-x-auto px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto pb-2">
            {visibleTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition-colors btn-focus",
                  currentTab === t.id
                    ? "bg-gold-gradient text-zinc-950"
                    : "text-brand-gray hover:bg-brand-card hover:text-brand-text"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {currentTab === "hoje" && <TodayTab />}
        {currentTab === "agendamentos" && <AppointmentsTab />}
        {currentTab === "historico" && <HistoryTab />}
        {currentTab === "clientes" && <ClientsTab />}
        {currentTab === "servicos" && <ServicesTab />}
        {currentTab === "funcionarios" && <EmployeesTab />}
        {currentTab === "bloqueios" && <BlockedTab />}
        {currentTab === "produtos" && <ProductsTab />}
        {currentTab === "config" && <ConfigTab />}
      </div>
    </main>
  );
}

/* ---------- HOJE ---------- */

function TodayTab() {
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

type PATCHData = AppointmentWithRelations;

/* ---------- AGENDAMENTOS ---------- */

function AppointmentsTab() {
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

function HistoryTab() {
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

/* ---------- CARD DE AGENDAMENTO ---------- */

function AppointmentCard({
  item,
  onChange,
}: {
  item: AppointmentWithRelations;
  onChange: (id: string, status: string) => void;
}) {
  const waToClient = buildWhatsAppLink(
    item.client_phone,
    statusWhatsAppMessage({
      clientName: item.client_name,
      date: item.appointment_date,
      time: item.appointment_time,
      status: item.status,
    })
  );

  const canConfirm = item.status === "pendente";
  const canConclude = item.status === "confirmado" || item.status === "pendente";
  const canCancel = !["cancelado", "concluido"].includes(item.status);

  return (
    <article className="rounded-2xl border border-brand-border bg-brand-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black">{item.appointment_time}</span>
            <Badge status={item.status} />
          </div>
          <h3 className="mt-1 font-semibold">{item.client_name}</h3>
          <p className="flex items-center gap-1.5 text-sm text-brand-gray">
            <CalendarIcon className="h-4 w-4" /> {formatDateBR(item.appointment_date)} ·{" "}
            <BarberPoleIcon className="h-4 w-4" /> {item.services?.name ?? "—"}
          </p>
          <p className="flex items-center gap-1.5 text-sm text-brand-gray">
            <UserIcon className="h-4 w-4" /> {item.employees?.name ?? "—"} ·{" "}
            <PhoneIcon className="h-4 w-4" /> {item.client_phone}
          </p>
          {item.notes && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-brand-gray/80">
              <NotesIcon className="h-4 w-4" /> {item.notes}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {canConfirm && (
            <ActionBtn
              label="Confirmar"
              onClick={() => onChange(item.id, "confirmado")}
              tone="green"
            />
          )}
          {canConclude && (
            <ActionBtn
              label="Concluir"
              onClick={() => onChange(item.id, "concluido")}
              tone="gold"
            />
          )}
          {canCancel && (
            <ActionBtn
              label="Cancelar"
              onClick={() => onChange(item.id, "cancelado")}
              tone="red"
            />
          )}
          <a
            href={waToClient}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg bg-brand-green px-3 py-1.5 text-xs font-bold text-brand-text transition-transform hover:scale-[1.03] btn-focus"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </article>
  );
}

function ActionBtn({
  label,
  onClick,
  tone,
}: {
  label: string;
  onClick: () => void;
  tone: "green" | "gold" | "red";
}) {
  const tones = {
    green: "border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10",
    gold: "bg-gold-gradient text-zinc-950",
    red: "border-red-400/40 text-red-300 hover:bg-red-400/10",
  } as const;
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors btn-focus",
        tone === "gold" ? tones.gold : tones[tone]
      )}
    >
      {label}
    </button>
  );
}

/* ---------- SERVIÇOS ---------- */

function ServicesTab() {
  const [items, setItems] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    duration_minutes: "",
  });

  const load = useCallback(async () => {
    try {
      const res = await api<Service[]>("/api/admin/services");
      setItems(res.data ?? []);
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => void load(), [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price.replace(",", ".")),
      duration_minutes: Number(form.duration_minutes),
    };
    if (editingId) {
      try {
        await api("/api/admin/services", {
          method: "PATCH",
          body: JSON.stringify({ id: editingId, ...payload }),
        });
        setToast("Serviço atualizado!");
      } catch (err) {
        setToast((err as Error).message);
        return;
      }
    } else {
      try {
        await api("/api/admin/services", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setToast("Serviço criado!");
      } catch (err) {
        setToast((err as Error).message);
        return;
      }
    }
    resetForm();
    await load();
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: "", description: "", price: "", duration_minutes: "" });
  };

  const edit = (item: Service) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description ?? "",
      price: String(item.price),
      duration_minutes: String(item.duration_minutes),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleActive = async (item: Service) => {
    try {
      await api("/api/admin/services", {
        method: "PATCH",
        body: JSON.stringify({ id: item.id, active: !item.active }),
      });
      await load();
    } catch (e) {
      setToast((e as Error).message);
    }
  };

  const remove = async (item: Service) => {
    if (!window.confirm(`Excluir o serviço "${item.name}"?`)) return;
    try {
      await api("/api/admin/services", {
        method: "DELETE",
        body: JSON.stringify({ id: item.id }),
      });
      setToast("Serviço excluído!");
      await load();
    } catch (e) {
      setToast((e as Error).message);
    }
  };

  return (
    <div>
      <TabHeader title="Serviços" subtitle="Ofertas exibidas no site" onRefresh={() => void load()} />
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <form onSubmit={submit} className="mt-6 rounded-2xl border border-brand-border bg-brand-card p-5">
        <h3 className="text-sm font-bold text-brand-gray">
          {editingId ? `Editando: ${items.find((i) => i.id === editingId)?.name}` : "Novo serviço"}
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-1">
            <Label>Nome *</Label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputCls}
              placeholder="Corte"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Descrição</Label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputCls}
              placeholder="Opicional"
            />
          </div>
          <div>
            <Label>Preço (R$) *</Label>
            <input
              required
              inputMode="decimal"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className={inputCls}
              placeholder="40,00"
            />
          </div>
          <div>
            <Label>Duração (min) *</Label>
            <input
              required
              inputMode="numeric"
              value={form.duration_minutes}
              onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
              className={inputCls}
              placeholder="30"
            />
          </div>
          <div className="flex items-end gap-2 sm:col-span-1">
            <button type="submit" className="rounded-lg bg-gold-gradient px-4 py-3 text-sm font-black text-zinc-950 btn-focus">
              {editingId ? "Salvar" : "Adicionar"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="rounded-lg border border-brand-border px-3 py-3 text-sm text-brand-gray btn-focus">
                Cancelar
              </button>
            )}
          </div>
        </div>
      </form>

      {loading ? (
        <EmptyState text="Carregando…" />
      ) : items.length === 0 ? (
        <EmptyState text="Cadastre seu primeiro serviço." />
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-brand-border bg-brand-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-brand-border text-left text-xs uppercase tracking-wider text-brand-gray">
                <th className="px-4 py-3">Serviço</th>
                <th className="px-4 py-3">Duração</th>
                <th className="px-4 py-3">Preço</th>
                <th className="px-4 py-3">Ativo</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-b border-brand-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{s.name}</div>
                    {s.description && (
                      <div className="text-xs text-brand-gray">{s.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">{s.duration_minutes} min</td>
                  <td className="px-4 py-3 font-bold text-brand-gold">{formatPrice(s.price)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => void toggleActive(s)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-bold btn-focus",
                        s.active ? "bg-emerald-400/15 text-emerald-300" : "bg-brand-card text-brand-gray border border-brand-border"
                      )}
                    >
                      {s.active ? "Ativo" : "Inativo"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <ActionBtn label="Editar" onClick={() => edit(s)} tone="gold" />
                      <ActionBtn label="Excluir" onClick={() => void remove(s)} tone="red" />
                    </div>
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

/* ---------- FUNCIONÁRIOS ---------- */

function EmployeesTab() {
  const [items, setItems] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", specialty: "" });

  const load = useCallback(async () => {
    try {
      const res = await api<Employee[]>("/api/admin/employees");
      setItems(res.data ?? []);
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => void load(), [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) {
      setToast("Informe um nome válido.");
      return;
    }
    const cleanedPhone = unmaskPhone(form.phone);
    if (cleanedPhone && !/^\d{10,11}$/.test(cleanedPhone)) {
      setToast("WhatsApp inválido.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      phone: cleanedPhone || null,
      specialty: form.specialty.trim() || null,
    };
    try {
      if (editingId) {
        await api("/api/admin/employees", { method: "PATCH", body: JSON.stringify({ id: editingId, ...payload }) });
        setToast("Funcionário atualizado!");
      } else {
        await api("/api/admin/employees", { method: "POST", body: JSON.stringify(payload) });
        setToast("Funcionário criado!");
      }
    } catch (err) {
      setToast((err as Error).message);
      return;
    }
    resetForm();
    await load();
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: "", phone: "", specialty: "" });
  };

  const edit = (item: Employee) => {
    setEditingId(item.id);
    setForm({ name: item.name, phone: item.phone ?? "", specialty: item.specialty ?? "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleActive = async (item: Employee) => {
    try {
      await api("/api/admin/employees", { method: "PATCH", body: JSON.stringify({ id: item.id, active: !item.active }) });
      await load();
    } catch (e) {
      setToast((e as Error).message);
    }
  };

  const remove = async (item: Employee) => {
    if (!window.confirm(`Excluir "${item.name}"?`)) return;
    try {
      await api("/api/admin/employees", { method: "DELETE", body: JSON.stringify({ id: item.id }) });
      setToast("Funcionário excluído!");
      await load();
    } catch (e) {
      setToast((e as Error).message);
    }
  };

  return (
    <div>
      <TabHeader title="Funcionários" subtitle="Profissionais disponíveis para agendamento" onRefresh={() => void load()} />
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <form onSubmit={submit} className="mt-6 rounded-2xl border border-brand-border bg-brand-card p-5">
        <h3 className="text-sm font-bold text-brand-gray">
          {editingId ? `Editando: ${items.find((i) => i.id === editingId)?.name}` : "Novo funcionário"}
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Nome *</Label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Lipe" />
          </div>
          <div>
            <Label>WhatsApp</Label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="(11) 99999-9999" />
          </div>
          <div>
            <Label>Especialidade</Label>
            <input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} className={inputCls} placeholder="Corte e barba" />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="submit" className="rounded-lg bg-gold-gradient px-4 py-3 text-sm font-black text-zinc-950 btn-focus">
            {editingId ? "Salvar" : "Adicionar"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="rounded-lg border border-brand-border px-3 py-3 text-sm text-brand-gray btn-focus">
              Cancelar
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <EmptyState text="Carregando…" />
      ) : items.length === 0 ? (
        <EmptyState text="Cadastre seu primeiro funcionário." />
      ) : (
        <div className="mt-4 grid gap-3">
          {items.map((emp) => (
            <article key={emp.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-border bg-brand-card p-4">
              <div className="flex items-center gap-3">
                <span
                  className="grid h-11 w-11 place-items-center rounded-full text-base font-black text-zinc-950"
                  style={{ backgroundColor: emp.color || "#d4af37" }}
                >
                  {emp.name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold">{emp.name}</h3>
                    <Badge status={emp.active ? "confirmado" : "cancelado"} />
                  </div>
                  <p className="text-sm text-brand-gray">
                    {[emp.specialty, emp.phone].filter(Boolean).join(" · ") || "Sem detalhes"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionBtn label="Editar" onClick={() => edit(emp)} tone="gold" />
                <button
                  onClick={() => void toggleActive(emp)}
                  className="rounded-lg border border-brand-border px-3 py-1.5 text-xs font-bold text-brand-gray hover:text-brand-text btn-focus"
                >
                  {emp.active ? "Desativar" : "Ativar"}
                </button>
                <ActionBtn label="Excluir" onClick={() => void remove(emp)} tone="red" />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- BLOQUEIOS ---------- */

function BlockedTab() {
  const [items, setItems] = useState<BlockedSlot[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState({ block_date: today(), block_time: "", reason: "", employee_id: "" });

  const load = useCallback(async () => {
    try {
      const [blockedRes, empRes] = await Promise.all([
        api<BlockedSlot[]>("/api/admin/blocked-slots"),
        api<Employee[]>("/api/admin/employees"),
      ]);
      setItems(blockedRes.data ?? []);
      setEmployees(empRes.data ?? []);
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => void load(), [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/api/admin/blocked-slots", {
        method: "POST",
        body: JSON.stringify({
          block_date: form.block_date,
          block_time: form.block_time || null,
          reason: form.reason,
          employee_id: form.employee_id || null,
        }),
      });
      setToast("Bloqueio criado!");
      setForm((f) => ({ ...f, block_time: "", reason: "", employee_id: "" }));
      await load();
    } catch (err) {
      setToast((err as Error).message);
    }
  };

  const remove = async (item: BlockedSlot) => {
    if (!window.confirm("Remover este bloqueio?")) return;
    try {
      await api("/api/admin/blocked-slots", { method: "DELETE", body: JSON.stringify({ id: item.id }) });
      setToast("Bloqueio removido!");
      await load();
    } catch (e) {
      setToast((e as Error).message);
    }
  };

  return (
    <div>
      <TabHeader title="Bloqueios" subtitle="Indisponibilidade de datas e horários" onRefresh={() => void load()} />
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <form onSubmit={submit} className="mt-6 rounded-2xl border border-brand-border bg-brand-card p-5">
        <h3 className="text-sm font-bold text-brand-gray">Novo bloqueio</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div>
            <Label>Data *</Label>
            <input type="date" required value={form.block_date} onChange={(e) => setForm({ ...form, block_date: e.target.value })} className={inputCls} />
          </div>
          <div>
            <Label>Horário</Label>
            <input type="time" value={form.block_time} onChange={(e) => setForm({ ...form, block_time: e.target.value })} className={inputCls} placeholder="Vazio = dia todo" />
          </div>
          <div>
            <Label>Profissional</Label>
            <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} className={inputCls}>
              <option value="">Todos</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Motivo</Label>
            <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className={inputCls} placeholder="Opicional" />
          </div>
        </div>
        <button type="submit" className="mt-4 rounded-lg bg-gold-gradient px-4 py-3 text-sm font-black text-zinc-950 btn-focus">
          Adicionar bloqueio
        </button>
      </form>

      {loading ? (
        <EmptyState text="Carregando…" />
      ) : items.length === 0 ? (
        <EmptyState text="Nenhum bloqueio cadastrado." />
      ) : (
        <div className="mt-4 grid gap-2">
          {items.map((b) => (
            <article key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-border bg-brand-card px-4 py-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-red/10 text-brand-red">
                  <BanIcon className="h-4 w-4" />
                </span>
                <div>
                  <div className="font-semibold">
                    {formatDateBR(b.block_date)}
                    {b.block_time ? ` às ${b.block_time}` : " (dia todo)"}
                  </div>
                  <div className="text-xs text-brand-gray">
                    {b.employee_id
                      ? `Profissional: ${employees.find((e) => e.id === b.employee_id)?.name ?? "?"}`
                      : "Todos os profissionais"}
                    {b.reason ? ` · ${b.reason}` : ""}
                  </div>
                </div>
              </div>
              <ActionBtn label="Remover" onClick={() => void remove(b)} tone="red" />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- PRODUTOS ---------- */

function ProductsTab() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    active: true,
  });

  const load = useCallback(async () => {
    try {
      const res = await api<Product[]>("/api/admin/products");
      setItems(res.data ?? []);
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => void load(), [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) {
      setToast("Informe um nome válido.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price) || 0,
      active: form.active,
    };
    try {
      if (editingId) {
        await api("/api/admin/products", { method: "PATCH", body: JSON.stringify({ id: editingId, ...payload }) });
        setToast("Produto atualizado!");
      } else {
        await api("/api/admin/products", { method: "POST", body: JSON.stringify(payload) });
        setToast("Produto criado!");
      }
    } catch (err) {
      setToast((err as Error).message);
      return;
    }
    resetForm();
    await load();
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: "", description: "", price: "", active: true });
  };

  const edit = (item: Product) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description ?? "",
      price: String(item.price),
      active: item.active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleActive = async (item: Product) => {
    try {
      await api("/api/admin/products", { method: "PATCH", body: JSON.stringify({ id: item.id, active: !item.active }) });
      await load();
    } catch (e) {
      setToast((e as Error).message);
    }
  };

  const remove = async (item: Product) => {
    if (!window.confirm(`Excluir "${item.name}"?`)) return;
    try {
      await api(`/api/admin/products?id=${item.id}`, { method: "DELETE" });
      setToast("Produto excluído!");
      await load();
    } catch (e) {
      setToast((e as Error).message);
    }
  };

  return (
    <div>
      <TabHeader title="Produtos" subtitle="Catálogo de produtos que os clientes podem pedir" onRefresh={() => void load()} />
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <form onSubmit={submit} className="mt-6 rounded-2xl border border-brand-border bg-brand-card p-5">
        <h3 className="text-sm font-bold text-brand-gray">
          {editingId ? "Editando produto" : "Novo produto"}
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>Nome *</Label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Pomada Modeladora" />
          </div>
          <div>
            <Label>Descrição</Label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} placeholder="Breve descrição" />
          </div>
          <div>
            <Label>Preço (R$)</Label>
            <input inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputCls} placeholder="35.00" />
          </div>
          <div>
            <Label>Ativo no catálogo</Label>
            <select value={form.active ? "1" : "0"} onChange={(e) => setForm({ ...form, active: e.target.value === "1" })} className={inputCls}>
              <option value="1">Sim</option>
              <option value="0">Não</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="submit" className="rounded-lg bg-gold-gradient px-4 py-3 text-sm font-black text-zinc-950 btn-focus">
            {editingId ? "Salvar" : "Adicionar"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="rounded-lg border border-brand-border px-3 py-3 text-sm text-brand-gray btn-focus">
              Cancelar
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <EmptyState text="Carregando…" />
      ) : items.length === 0 ? (
        <EmptyState text="Cadastre seu primeiro produto." />
      ) : (
        <div className="mt-4 grid gap-3">
          {items.map((p) => (
            <article key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-border bg-brand-card p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-orange/15 text-brand-orange">
                  <PackageIcon className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold">{p.name}</h3>
                    <Badge status={p.active ? "confirmado" : "cancelado"} />
                  </div>
                  <p className="text-sm text-brand-gray">
                    {[p.description, formatPrice(p.price)].filter(Boolean).join(" · ") || "Sem detalhes"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionBtn label="Editar" onClick={() => edit(p)} tone="gold" />
                <button
                  onClick={() => void toggleActive(p)}
                  className="rounded-lg border border-brand-border px-3 py-1.5 text-xs font-bold text-brand-gray hover:text-brand-text btn-focus"
                >
                  {p.active ? "Desativar" : "Ativar"}
                </button>
                <ActionBtn label="Excluir" onClick={() => void remove(p)} tone="red" />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- CONFIGURAÇÕES ---------- */

function ConfigTab() {
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

/* ---------- CLIENTES ---------- */

function ClientsTab() {
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
                        <div className="font-semibold">{s.plans?.name ?? "Plano removido"}</div>
                        <div className="text-xs text-brand-gray">
                          {s.start_date ? `Início ${formatDateBR(s.start_date)}` : "Aguardando aprovação"}
                          {s.end_date ? ` · até ${formatDateBR(s.end_date)}` : ""}
                          {s.plans ? ` · ${formatPrice(s.plans.price)}` : ""}
                        </div>
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

/* ---------- SHARED UI ---------- */

const inputCls =
  "w-full rounded-lg border border-brand-border bg-brand-darker px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-gray/60 btn-focus";

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-xs font-medium text-brand-gray">{children}</label>;
}

function TabHeader({
  title,
  subtitle,
  onRefresh,
  children,
}: {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-brand-gray">{subtitle}</p>}
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="rounded-lg border border-brand-border px-3 py-2 text-sm font-semibold text-brand-gray transition-colors hover:text-brand-text btn-focus"
          >
            Atualizar
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-brand-border p-10 text-center text-sm text-brand-gray">
      {text}
    </div>
  );
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-5 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-xl border border-brand-border bg-brand-dark px-5 py-3 text-sm shadow-2xl animate-fade-in-up">
      <span>{message}</span>
      <button onClick={onClose} aria-label="Fechar" className="text-brand-gray transition-colors hover:text-brand-text btn-focus">
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
  );
}