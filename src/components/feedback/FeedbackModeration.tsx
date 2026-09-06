"use client";

import { useEffect, useState } from "react";
import { StarRating } from "@/components/feedback/StarRating";
import { Loading } from "@/components/Loading";
import { cn, formatDateBR } from "@/lib/utils";

type Feedback = {
  id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  photo_url: string | null;
  status: string;
  created_at: string;
};

const STATUS_STYLE: Record<string, string> = {
  pendente: "border-yellow-400/40 bg-yellow-400/10 text-yellow-300",
  aprovado: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  recusado: "border-brand-red/40 bg-brand-red/10 text-brand-red",
};

export default function FeedbackModeration() {
  const [items, setItems] = useState<Feedback[] | null>(null);
  const [filter, setFilter] = useState<string>("pendente");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/feedbacks${filter ? `?status=${filter}` : ""}`)
      .then((r) => r.json())
      .then((json) => {
        if (active) setItems(json.ok ? json.data : []);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, [filter]);

  const moderate = async (id: string, status: "aprovado" | "recusado") => {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/feedbacks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setItems((prev) => (prev ?? []).filter((f) => f.id !== id));
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {["pendente", "aprovado", "recusado", ""].map((s) => (
          <button
            key={s || "todos"}
            type="button"
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-bold transition-colors btn-focus",
              filter === s
                ? "bg-gold-gradient text-zinc-950"
                : "border border-brand-border text-brand-gray hover:text-brand-text"
            )}
          >
            {s === "" ? "Todos" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {items === null ? (
        <div className="mt-10">
          <Loading label="Carregando feedbacks…" />
        </div>
      ) : items.length === 0 ? (
        <p className="mt-10 text-center text-sm text-brand-gray">
          Nenhum feedback neste filtro.
        </p>
      ) : (
        <div className="mt-5 grid gap-3">
          {items.map((f) => (
            <article
              key={f.id}
              className="rounded-2xl border border-brand-border bg-brand-card p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-gold-gradient text-sm font-black text-zinc-950">
                    {f.customer_name.charAt(0).toUpperCase()}
                  </span>
                  <span>
                    <span className="block text-sm font-bold">{f.customer_name}</span>
                    <span className="block text-[10px] text-brand-gray">
                      {formatDateBR(f.created_at.split("T")[0])}
                    </span>
                  </span>
                  <StarRating value={f.rating} size="h-3.5 w-3.5" />
                </div>
                <span
                  className={cn(
                    "inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                    STATUS_STYLE[f.status] ?? ""
                  )}
                >
                  {f.status}
                </span>
              </div>

              {f.comment && (
                <p className="mt-3 text-sm text-brand-muted">“{f.comment}”</p>
              )}

              {f.photo_url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={f.photo_url}
                  alt="Foto do feedback"
                  className="mt-3 h-36 w-full max-w-[280px] rounded-xl object-cover"
                />
              )}

              {f.status === "pendente" && (
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === f.id}
                    onClick={() => void moderate(f.id, "aprovado")}
                    className="rounded-lg bg-emerald-500/90 px-4 py-2 text-xs font-black text-zinc-950 transition-transform hover:scale-105 btn-focus disabled:opacity-50"
                  >
                    Aprovar
                  </button>
                  <button
                    type="button"
                    disabled={busyId === f.id}
                    onClick={() => void moderate(f.id, "recusado")}
                    className="rounded-lg border border-brand-red/40 px-4 py-2 text-xs font-black text-brand-red transition-colors hover:bg-brand-red/10 btn-focus disabled:opacity-50"
                  >
                    Recusar
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
