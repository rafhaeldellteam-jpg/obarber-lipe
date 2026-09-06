"use client";

import { useState } from "react";
import { StarIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  onChange,
  size = "h-6 w-6",
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: string;
}) {
  const [hover, setHover] = useState(0);
  const interactive = Boolean(onChange);
  const display = hover || value;

  return (
    <div className="flex items-center gap-1" role={interactive ? "radiogroup" : undefined} aria-label="Avaliação">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          aria-label={`${n} estrela${n === 1 ? "" : "s"}`}
          aria-pressed={interactive ? value === n : undefined}
          onMouseEnter={interactive ? () => setHover(n) : undefined}
          onMouseLeave={interactive ? () => setHover(0) : undefined}
          onClick={interactive ? () => onChange?.(n) : undefined}
          className={cn(
            "transition-transform duration-150",
            interactive && "hover:scale-125 btn-focus rounded",
            !interactive && "cursor-default"
          )}
        >
          <StarIcon
            filled={n <= display}
            className={cn(size, n <= display ? "text-brand-orange" : "text-brand-border")}
          />
        </button>
      ))}
    </div>
  );
}
