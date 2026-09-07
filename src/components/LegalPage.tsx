import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ArrowLeftIcon } from "@/components/icons";

type Section = {
  title: string;
  paragraphs: string[];
};

export function LegalPage({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: Section[];
}) {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <Link
          href="/"
          className="text-sm font-semibold text-brand-gold hover:underline btn-focus rounded"
        >
          <span className="inline-flex items-center gap-1.5">
            <ArrowLeftIcon className="h-4 w-4" /> Voltar ao início
          </span>
        </Link>
        <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-brand-gray">Última atualização: {updated}</p>

        <div className="mt-8 space-y-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-bold">{s.title}</h2>
              {s.paragraphs.map((p, i) => (
                <p key={i} className="mt-2 text-sm leading-relaxed text-brand-gray">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}