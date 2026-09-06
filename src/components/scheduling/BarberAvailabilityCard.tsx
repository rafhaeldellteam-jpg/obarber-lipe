"use client";

import type { Employee } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CheckIcon } from "@/components/icons";

export function BarberAvailabilityCard({
  employee,
  selected,
  freeSlotsLabel,
  onSelect,
  index = 0,
}: {
  employee: Employee;
  selected: boolean;
  freeSlotsLabel?: string;
  onSelect: () => void;
  index?: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      style={{ "--i": index } as React.CSSProperties}
      className={cn(
        "animate-fade-in-up stagger-delay group flex min-w-[150px] items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-200 btn-focus",
        selected
          ? "border-brand-gold bg-brand-gold/10 ring-2 ring-brand-gold/60 shadow-lg shadow-brand-gold/10"
          : "border-brand-border bg-brand-card hover:border-brand-gold/40 hover:scale-[1.02]"
      )}
    >
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-base font-black text-zinc-950 transition-transform duration-200 group-hover:scale-110"
        style={{ background: employee.color ?? "#f97316" }}
      >
        {employee.name.charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-bold">{employee.name}</span>
          {selected && <CheckIcon className="h-4 w-4 shrink-0 text-brand-gold" />}
        </span>
        <span className="block truncate text-xs text-brand-gray">
          {employee.specialty ?? "Profissional"}
        </span>
        {freeSlotsLabel && (
          <span className="mt-1 inline-block rounded-full bg-brand-orange/10 px-2 py-0.5 text-[10px] font-bold text-brand-orange">
            {freeSlotsLabel}
          </span>
        )}
      </span>
    </button>
  );
}
