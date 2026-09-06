"use client";

import { useEffect, useState } from "react";
import { StarRating } from "@/components/feedback/StarRating";
import { formatDateBR } from "@/lib/utils";

type Feedback = {
  id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  photo_url: string | null;
  created_at: string;
};

export function FeedbackShowcase({ className }: { className?: string }) {
  const [feedbacks, setFeedbacks] = useState<Feedback[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/feedbacks")
      .then((r) => r.json())
      .then((json) => {
        if (active) setFeedbacks(json.ok ? json.data : []);
      })
      .catch(() => {
        if (active) setFeedbacks([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (feedbacks !== null && feedbacks.length === 0) return null;

  return (
    <section className={className} aria-label="Feedbacks dos clientes">
      <h2 className="flex items-center gap-2 text-lg font-black">
        O que dizem sobre a gente
        <span className="rounded-full bg-brand-orange/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-orange">
          clientes reais
        </span>
      </h2>

      {feedbacks === null ? (
        <div className="mt-3 flex snap-x gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-36 w-[280px] shrink-0 animate-pulse rounded-2xl bg-brand-border/40"
            />
          ))}
        </div>
      ) : (
        <div className="-mx-1 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {feedbacks.map((f, i) => (
            <figure
              key={f.id}
              style={{ "--i": i } as React.CSSProperties}
              className="animate-fade-in-up stagger-delay flex w-[280px] shrink-0 snap-start flex-col gap-3 rounded-2xl border border-brand-border bg-brand-card p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-gold-gradient text-sm font-black text-zinc-950">
                    {f.customer_name.charAt(0).toUpperCase()}
                  </span>
                  <span>
                    <span className="block max-w-[160px] truncate text-sm font-bold">
                      {f.customer_name}
                    </span>
                    <span className="block text-[10px] text-brand-gray">
                      {formatDateBR(f.created_at.split("T")[0])}
                    </span>
                  </span>
                </span>
                <StarRating value={f.rating} size="h-3.5 w-3.5" />
              </div>

              {f.photo_url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={f.photo_url}
                  alt={`Foto do feedback de ${f.customer_name}`}
                  loading="lazy"
                  className="h-32 w-full rounded-xl object-cover"
                />
              )}

              {f.comment && (
                <blockquote className="text-sm leading-relaxed text-brand-muted">
                  “{f.comment}”
                </blockquote>
              )}
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
