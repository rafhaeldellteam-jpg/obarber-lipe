"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch("/api/log-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        path: window.location.pathname,
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-brand-black px-4">
      <div className="max-w-sm rounded-2xl border border-brand-border bg-brand-card p-8 text-center">
        <h1 className="text-2xl font-black">Algo deu errado</h1>
        <p className="mt-2 text-sm text-brand-gray">
          Encontramos um erro inesperado. Nossa equipe já foi avisada
          automaticamente.
        </p>
        <button
          onClick={reset}
          className="mt-6 w-full rounded-xl bg-gold-gradient px-4 py-3 text-sm font-black text-zinc-950 btn-focus"
        >
          Tentar novamente
        </button>
      </div>
    </main>
  );
}
