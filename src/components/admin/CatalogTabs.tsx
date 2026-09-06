"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  Service,
  Employee,
  BlockedSlot,
  Product
} from "@/lib/types";
import {
  formatDateBR,
  formatPrice,
  today,
  unmaskPhone,
} from "@/lib/utils";
import { cn } from "@/lib/utils";

import {
  BanIcon,
  PackageIcon
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

/* ---------- SERVIÇOS ---------- */

export function ServicesTab() {
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

export function EmployeesTab() {
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

export function BlockedTab() {
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

export function ProductsTab() {
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

