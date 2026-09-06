"use client";

import { useEffect } from "react";

/**
 * Captura erros globais do cliente (exceções não tratadas e promises
 * rejeitadas) e envia para /api/log-error. Throttle simples: no máximo
 * 1 envio a cada 5 segundos para não inundar o banco em loop de erros.
 */
export function ErrorReporter() {
  useEffect(() => {
    let lastSent = 0;

    const report = (message: string, stack?: string) => {
      const now = Date.now();
      if (now - lastSent < 5000) return;
      lastSent = now;
      void fetch("/api/log-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          stack,
          path: window.location.pathname,
        }),
      }).catch(() => {});
    };

    const onError = (e: ErrorEvent) => {
      report(e.message, e.error?.stack);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason;
      report(
        typeof reason?.message === "string" ? reason.message : String(reason),
        reason?.stack
      );
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
