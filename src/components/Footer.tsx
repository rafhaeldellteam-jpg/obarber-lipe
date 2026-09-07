import Image from "next/image";
import { OWNER_WHATSAPP } from "@/lib/config";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export function Footer() {
  return (
    <footer id="contato" className="scroll-mt-20 border-t border-brand-border bg-brand-darker">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <Image
                src="/icon-192.png"
                alt="Obarber Lipe"
                width={36}
                height={36}
                className="h-9 w-9 rounded-full"
              />
              <span className="text-lg font-bold">
                Obarber <span className="text-brand-gold">Lipe</span>
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-brand-gray">
              Agendamento online e atendimento de qualidade. Precisão, estilo e
              tradição.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-brand-gray">
              Navegação
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                ["#inicio", "Início"],
                ["#servicos", "Serviços"],
                ["#agendar", "Agendar horário"],
              ].map(([href, label]) => (
                <li key={href}>
                  <a href={href} className="text-brand-gray transition-colors hover:text-brand-text">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-brand-gray">
              Contato
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  href={buildWhatsAppLink(OWNER_WHATSAPP, "Olá! Vim pelo site da Obarber Lipe.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-gray transition-colors hover:text-brand-green"
                >
                  WhatsApp
                </a>
              </li>
              <li>
                <a href="#agendar" className="text-brand-gray transition-colors hover:text-brand-text">
                  Agendar online
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-brand-border pt-6 text-xs text-brand-gray sm:flex-row">
          <p>© {new Date().getFullYear()} Obarber Lipe. Todos os direitos reservados.</p>
          <a
            href="/admin"
            className="rounded-lg px-3 py-1.5 text-xs text-brand-gray transition-colors hover:text-brand-gold"
          >
            Painel admin
          </a>
        </div>
      </div>
    </footer>
  );
}