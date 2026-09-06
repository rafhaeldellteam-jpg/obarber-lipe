"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Remaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
  progressPct: number | null;
};

function computeRemaining(endDate: string, startDate?: string | null): Remaining {
  const end = new Date(`${endDate}T23:59:59`).getTime();
  const now = Date.now();
  const diff = end - now;
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true, progressPct: 100 };
  }
  const totalSeconds = Math.floor(diff / 1000);

  let progressPct: number | null = null;
  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`).getTime();
    if (!Number.isNaN(start) && end > start) {
      progressPct = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
    }
  }

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: false,
    progressPct,
  };
}

function urgencyClass(days: number) {
  if (days <= 3) return "text-brand-red";
  if (days <= 7) return "text-yellow-400";
  return "text-emerald-400";
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <span className="flex min-w-[44px] flex-col items-center rounded-xl border border-brand-border bg-brand-darker px-2 py-1.5">
      <span className="font-mono text-lg font-black tabular-nums leading-none">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-brand-muted">
        {label}
      </span>
    </span>
  );
}

export function PlanCountdown({
  endDate,
  startDate,
  compact = false,
  className,
}: {
  endDate: string;
  startDate?: string | null;
  compact?: boolean;
  className?: string;
}) {
  // Hydration-safe: servidor e primeiro render do cliente usam null
  const [remaining, setRemaining] = useState<Remaining | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(computeRemaining(endDate, startDate));
    const timeout = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [endDate, startDate]);

  if (remaining === null) {
    return (
      <span className={cn("text-sm text-brand-muted", className)}>
        Calculando…
      </span>
    );
  }

  if (remaining.expired) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-brand-red/40 bg-brand-red/10 px-3 py-1 text-xs font-black text-brand-red",
          className
        )}
      >
        Plano expirado
      </span>
    );
  }

  if (compact) {
    return (
      <span
        className={cn(
          "font-mono text-sm font-black tabular-nums",
          urgencyClass(remaining.days),
          className
        )}
      >
        {remaining.days}d {String(remaining.hours).padStart(2, "0")}h{" "}
        {String(remaining.minutes).padStart(2, "0")}m
      </span>
    );
  }

  const barColor =
    remaining.days <= 3
      ? "bg-brand-red"
      : remaining.days <= 7
        ? "bg-yellow-400"
        : "bg-emerald-400";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap gap-1.5" role="timer" aria-live="off">
        <Unit value={remaining.days} label="dias" />
        <Unit value={remaining.hours} label="horas" />
        <Unit value={remaining.minutes} label="min" />
        <Unit value={remaining.seconds} label="seg" />
      </div>
      <p className={cn("text-xs font-bold", urgencyClass(remaining.days))}>
        {remaining.days <= 3
          ? "Seu plano está acabando!"
          : remaining.days <= 7
            ? "Faltam poucos dias — renove já!"
            : "Tempo restante do plano"}
      </p>

      {remaining.progressPct !== null && (
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-brand-border"
          role="progressbar"
          aria-valuenow={Math.round(remaining.progressPct)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={cn("h-full rounded-full transition-all duration-500", barColor)}
            style={{ width: `${remaining.progressPct}%` }}
          />
        </div>
      )}
    </div>
  );
}
