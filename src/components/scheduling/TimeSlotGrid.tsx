"use client";

import type { AvailableSlot } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TimeSlotGrid({
  slots,
  selectedTime,
  onSelect,
}: {
  slots: AvailableSlot[];
  selectedTime: string;
  onSelect: (time: string) => void;
}) {
  return (
    <div>
      <div className="grid max-h-48 grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-6">
        {slots.map((slot, i) => {
          const selected = slot.available && selectedTime === slot.time;
          return (
            <button
              key={slot.time}
              type="button"
              disabled={!slot.available}
              aria-pressed={selected}
              aria-label={
                slot.available
                  ? `Horário ${slot.time} disponível`
                  : `Horário ${slot.time} indisponível`
              }
              onClick={() => onSelect(slot.time)}
              style={{ "--i": i } as React.CSSProperties}
              className={cn(
                "animate-slot-pop stagger-delay rounded-xl border px-2 py-2.5 text-sm font-bold transition-all duration-150 btn-focus",
                !slot.available &&
                  "cursor-not-allowed border-transparent bg-brand-darker text-brand-muted/40 line-through opacity-50",
                slot.available &&
                  !selected &&
                  "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:scale-105 hover:border-emerald-400 hover:bg-emerald-500/20",
                selected &&
                  "border-brand-gold bg-gold-gradient text-zinc-950 shadow-md shadow-brand-gold/25 scale-[1.05]"
              )}
            >
              {slot.time}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-4 text-[11px] text-brand-gray">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Disponível
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-border" /> Indisponível
        </span>
      </div>
    </div>
  );
}
