"use client";

import { useState } from "react";
import type { Employee, Plan } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { CheckIcon, CloseIcon } from "@/components/icons";

export function RequestPlanModal({
  plans,
  employees,
  busy,
  initialPlanId = "",
  onClose,
  onSubmit,
}: {
  plans: Plan[];
  employees: Employee[];
  busy: boolean;
  initialPlanId?: string;
  onClose: () => void;
  onSubmit: (planId: string, employeeId: string) => void;
}) {
  const [planId, setPlanId] = useState(initialPlanId);
  const [employeeId, setEmployeeId] = useState("");

  const canSubmit = Boolean(planId) && Boolean(employeeId) && !busy;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg animate-fade-in-up rounded-3xl border border-brand-gold/30 bg-brand-card p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-black">Ativar meu plano</h3>
            <p className="mt-1 text-sm text-brand-muted">
              Escolha o plano e o barbeiro. Assim que ele aprovar no painel, a
              contagem começa automaticamente.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-brand-border text-brand-muted transition-colors hover:text-brand-text btn-focus"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-gray">
            1 · Plano
          </p>
          <div className="mt-2 grid gap-2">
            {plans.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={planId === p.id}
                onClick={() => setPlanId(p.id)}
                className={`rounded-xl border p-3 text-left transition-all btn-focus ${
                  planId === p.id
                    ? "border-brand-gold bg-brand-gold/15 ring-1 ring-brand-gold"
                    : "border-brand-border hover:border-brand-gold/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold">{p.name}</span>
                  <span className="text-sm font-black text-brand-gold">
                    {formatPrice(p.price)}
                  </span>
                </div>
                <span className="mt-0.5 block text-xs text-brand-gray">
                  {p.cuts_per_period} cortes · {p.duration_days} dias
                </span>
              </button>
            ))}
            {plans.length === 0 && (
              <p className="text-sm text-brand-gray">
                Nenhum plano disponível no momento.
              </p>
            )}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-gray">
            2 · Barbeiro
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {employees.map((e) => (
              <button
                key={e.id}
                type="button"
                aria-pressed={employeeId === e.id}
                onClick={() => setEmployeeId(e.id)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all btn-focus ${
                  employeeId === e.id
                    ? "border-brand-gold bg-brand-gold/15 ring-1 ring-brand-gold"
                    : "border-brand-border text-brand-gray hover:border-brand-gold/40 hover:text-brand-text"
                }`}
              >
                <span
                  className="grid h-7 w-7 place-items-center rounded-full text-xs font-black text-zinc-950"
                  style={{ background: e.color ?? "#f97316" }}
                >
                  {e.name.charAt(0).toUpperCase()}
                </span>
                {e.name}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => onSubmit(planId, employeeId)}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gold-gradient py-3.5 text-sm font-black text-zinc-950 transition-transform hover:scale-[1.01] btn-focus disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? (
            "Enviando…"
          ) : (
            <>
              <CheckIcon className="h-4 w-4" /> Solicitar ativação
            </>
          )}
        </button>
        <p className="mt-3 text-center text-xs text-brand-gray">
          O barbeiro confirma o pagamento no atendimento e aprova — a contagem
          começa na hora da aprovação.
        </p>
      </div>
    </div>
  );
}
