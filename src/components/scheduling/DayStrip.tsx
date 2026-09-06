"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { today, addDays, formatDateBR } from "@/lib/utils";

type Day = {
  date: string;
  weekday: string;
  dayNumber: string;
  month: string;
  isToday: boolean;
};

function buildDays(count: number): Day[] {
  const names = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const months = [
    "jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez",
  ];
  const base = today();
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(base, i);
    const [y, m, d] = date.split("-").map(Number);
    const dObj = new Date(y, m - 1, d);
    return {
      date,
      weekday: names[dObj.getDay()],
      dayNumber: String(d),
      month: months[m - 1],
      isToday: i === 0,
    };
  });
}

export function DayStrip({
  selectedDate,
  minDate,
  maxDays = 30,
  onSelect,
}: {
  selectedDate: string;
  minDate?: string;
  maxDays?: number;
  onSelect: (date: string) => void;
}) {
  const days = useMemo(() => buildDays(maxDays), [maxDays]);

  return (
    <div
      className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="listbox"
      aria-label="Escolha o dia"
    >
      {days.map((day, i) => {
        const disabled = minDate ? day.date < minDate : false;
        const selected = day.date === selectedDate;
        return (
          <button
            key={day.date}
            type="button"
            role="option"
            aria-selected={selected}
            disabled={disabled}
            onClick={() => onSelect(day.date)}
            style={{ "--i": i } as React.CSSProperties}
            className={cn(
              "animate-slot-pop stagger-delay flex w-[64px] shrink-0 snap-start flex-col items-center rounded-2xl border px-2 py-2.5 transition-all duration-200 btn-focus",
              disabled && "cursor-not-allowed opacity-30",
              selected
                ? "border-brand-gold bg-gold-gradient text-zinc-950 shadow-lg shadow-brand-gold/20 scale-[1.04]"
                : "border-brand-border bg-brand-card text-brand-text hover:border-brand-gold/50 hover:scale-[1.02]"
            )}
            title={formatDateBR(day.date)}
          >
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider",
                selected ? "text-zinc-800" : day.isToday ? "text-brand-orange" : "text-brand-gray"
              )}
            >
              {day.isToday ? "hoje" : day.weekday}
            </span>
            <span className="mt-0.5 text-xl font-black leading-none">{day.dayNumber}</span>
            <span
              className={cn(
                "text-[10px] font-semibold",
                selected ? "text-zinc-700" : "text-brand-gray"
              )}
            >
              {day.month}
            </span>
          </button>
        );
      })}
    </div>
  );
}
