import { supabaseAdmin } from "@/lib/supabase";
import { formatPrice } from "@/lib/utils";
import type { Service } from "@/lib/types";

export async function ServicesSection() {
  let services: Service[] = [];
  try {
    const { data } = await supabaseAdmin
      .from("services")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    services = data ?? [];
  } catch {
    services = [];
  }

  if (!services || services.length === 0) {
    return null;
  }

  return (
    <section id="servicos" className="scroll-mt-20 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold">
            Serviços
          </span>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            O que você precisa pro <span className="text-gradient-gold">visual</span>
          </h2>
          <p className="mt-3 text-brand-gray">
            Todos os serviços podem ser agendados online. Os preços podem variar
            conforme o profissional.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <article
              key={service.id}
              className="group rounded-2xl border border-brand-border bg-brand-card p-6 transition-colors hover:border-brand-gold/40"
            >
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-bold">{service.name}</h3>
                <span className="shrink-0 text-lg font-black text-brand-gold">
                  {formatPrice(service.price)}
                </span>
              </div>
              {service.description && (
                <p className="mt-2 text-sm leading-relaxed text-brand-gray">
                  {service.description}
                </p>
              )}
              <div className="mt-4 flex items-center justify-between text-xs text-brand-gray">
                <span>Duração: {service.duration_minutes} min</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}