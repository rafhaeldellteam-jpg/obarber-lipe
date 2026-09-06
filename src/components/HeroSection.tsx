import { ScissorsIcon } from "@/components/icons";

export function HeroSection() {
  return (
    <section id="inicio" className="relative overflow-hidden pt-24 pb-16 sm:pt-32 sm:pb-24">
      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-brand-gold/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-brand-gold/5 blur-3xl" />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
        <div className="animate-fade-in-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-gold/30 bg-brand-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-gold">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-gold animate-pulse" />
            Barbearia com agendamento online
          </span>
          <h1 className="mt-5 text-4xl font-black leading-[1.08] tracking-tight sm:text-6xl">
            Seu estilo começa <span className="text-gradient-gold">aqui</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-brand-gray sm:text-lg">
            Corte, barba e navalha com quem entende do assunto. Escolha o
            profissional, o serviço e o horário — sem fila, sem espera, direto
            pelo WhatsApp.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#agendar"
              className="rounded-xl bg-gold-gradient px-6 py-3.5 font-bold text-zinc-950 transition-transform hover:scale-[1.03] btn-focus"
            >
              Agendar agora
            </a>
            <a
              href="#servicos"
              className="rounded-xl border border-brand-border px-6 py-3.5 font-medium text-brand-text transition-colors hover:border-brand-gold/40 hover:bg-brand-card btn-focus"
            >
              Ver serviços
            </a>
          </div>

          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-brand-border pt-6">
            {[
              ["100%", "online"],
              ["30 dias", "de antecedência"],
              ["0", "filas"],
            ].map(([v, l]) => (
              <div key={l}>
                <dt className="text-2xl font-black text-gradient-gold">{v}</dt>
                <dd className="text-xs text-brand-gray uppercase tracking-wide">{l}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="animate-fade-in-up relative hidden lg:block" style={{ animationDelay: "120ms" }}>
          <div className="aspect-[4/5] rounded-3xl border border-brand-border bg-brand-card p-8">
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="grid h-24 w-24 place-items-center rounded-2xl bg-gold-gradient text-zinc-950">
                <ScissorsIcon className="h-10 w-10" />
              </div>
              <div className="mt-6 text-2xl font-black">Obarber Lipe</div>
              <div className="mt-1 text-sm text-brand-gray">Precisão, estilo e tradição</div>
              <div className="mt-6 grid w-full grid-cols-2 gap-3">
                {["Corte", "Barba", "Sobrancelha", "Rei"].map((label) => (
                  <div
                    key={label}
                    className="rounded-xl border border-brand-border bg-brand-darker p-3 text-center text-sm font-semibold"
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}