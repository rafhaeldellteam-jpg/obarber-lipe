"use client";

import type {
  AppointmentWithRelations,
} from "@/lib/types";
import {
  formatDateBR
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
  CloseIcon
} from "@/components/icons";

export async function api<T = unknown>(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = await res.json().catch(() => ({ ok: false }));
  if (!res.ok) throw new Error(json.message || "Erro na requisição.");
  return json as { ok: boolean; data?: T; message?: string };
}

export const statusColor: Record<string, string> = {
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

export function Badge({ status }: { status: string }) {
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

export const inputCls =
  "w-full rounded-lg border border-brand-border bg-brand-darker px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-gray/60 btn-focus";

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-xs font-medium text-brand-gray">{children}</label>;
}

export function TabHeader({
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

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-brand-border p-10 text-center text-sm text-brand-gray">
      {text}
    </div>
  );
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-5 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-xl border border-brand-border bg-brand-dark px-5 py-3 text-sm shadow-2xl animate-fade-in-up">
      <span>{message}</span>
      <button onClick={onClose} aria-label="Fechar" className="text-brand-gray transition-colors hover:text-brand-text btn-focus">
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

export type PATCHData = AppointmentWithRelations;

/* ---------- CARD DE AGENDAMENTO ---------- */

export function AppointmentCard({
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

export function ActionBtn({
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

