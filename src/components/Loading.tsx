export function Loading({ label }: { label?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden="true"
        className="h-8 w-8 animate-spin rounded-full border-2 border-brand-border border-t-brand-orange"
      />
      {label ? (
        <span className="text-sm text-brand-muted">{label}</span>
      ) : null}
    </div>
  );
}

export function SkeletonSlots({ count = 12 }: { count?: number }) {
  return (
    <div
      aria-hidden="true"
      className="grid max-h-44 grid-cols-4 gap-2 overflow-hidden pr-1 sm:grid-cols-6"
    >
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="h-8 animate-pulse rounded-lg bg-brand-border/60"
          style={{ animationDelay: `${(i % 6) * 90}ms` }}
        />
      ))}
    </div>
  );
}
