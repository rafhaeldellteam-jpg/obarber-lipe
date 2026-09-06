"use client";

import { cn } from "@/lib/utils";

export function TimeSlotGrid({
  times,
  selectedTime,
  onSelect,
}: {
  times: string[];
  selectedTime: string;
  onSelect: (time: string) => void;
}) {
  return (
    <div className="grid max-h-48 grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-6">
      {times.map((t, i) => (
        <button
          key={t}
          type="button"
          aria-pressed={selectedTime === t}
          onClick={() => onSelect(t)}
          style={{ "--i": i } as React.CSSProperties}
          className={cn(
            "animate-slot-pop stagger-delay rounded-xl border px-2 py-2.5 text-sm font-bold transition-all duration-150 btn-focus",
            selectedTime === t
              ? "border-brand-gold bg-gold-gradient text-zinc-950 shadow-md shadow-brand-gold/25 scale-[1.05]"
              : "border-brand-border bg-brand-card text-brand-text hover:border-brand-gold/60 hover:scale-105"
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
