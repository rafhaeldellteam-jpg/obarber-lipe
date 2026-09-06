"use client";

import {
  useEffect,
  useState
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/AuthContext";
import type {
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Loading } from "@/components/Loading";

type Tab =
  | "hoje"
  | "agendamentos"
  | "feedbacks"
  | "historico"
  | "clientes"
  | "servicos"
  | "funcionarios"
  | "bloqueios"
  | "produtos"
  | "config";

const TABS: { id: Tab; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "agendamentos", label: "Agendamentos" },
  { id: "feedbacks", label: "Feedbacks" },
  { id: "historico", label: "Histórico" },
  { id: "clientes", label: "Clientes" },
  { id: "servicos", label: "Serviços" },
  { id: "funcionarios", label: "Funcionários" },
  { id: "bloqueios", label: "Bloqueios" },
  { id: "produtos", label: "Produtos" },
  { id: "config", label: "Configurações" },
];

// Abas restritas a master/admin (gestão do catálogo e equipe)
const MANAGER_ONLY_TABS: Tab[] = ["servicos", "funcionarios"];

import { TodayTab } from "@/components/admin/TodayTab";
import { AppointmentsTab, HistoryTab } from "@/components/admin/AppointmentsTab";
import { ServicesTab, EmployeesTab, BlockedTab, ProductsTab } from "@/components/admin/CatalogTabs";
import { ConfigTab } from "@/components/admin/ConfigTab";
import { ClientsTab } from "@/components/admin/ClientsTab";

const FeedbackModeration = dynamic(() => import("@/components/feedback/FeedbackModeration"));

export default function AdminPage() {
  const { user, isAdmin, loading, signOut, role } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("hoje");

  const isBarber = role === "barber";
  const visibleTabs = isBarber
    ? TABS.filter((t) => !MANAGER_ONLY_TABS.includes(t.id))
    : TABS;

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.replace("/");
    }
  }, [loading, user, isAdmin, router]);

  const currentTab =
    isBarber && MANAGER_ONLY_TABS.includes(tab) ? "hoje" : tab;

  if (loading || !user || !isAdmin) {
    return (
      <main className="grid min-h-screen place-items-center bg-brand-black">
        <Loading />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-black">
      <header className="sticky top-0 z-40 border-b border-brand-border bg-brand-black/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-gold-gradient text-lg font-black text-zinc-950">
              L
            </span>
            <div className="leading-tight">
              <div className="text-sm font-black">
                Obarber <span className="text-brand-gold">Lipe</span>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-brand-gray">
                {isBarber ? "Painel do barbeiro" : "Painel admin"}
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-brand-gray sm:block">
              {user.email}
            </span>
            <button
              onClick={() => void signOut()}
              className="rounded-lg border border-brand-border px-4 py-2 text-sm font-semibold text-brand-gray transition-colors hover:text-brand-text btn-focus"
            >
              Sair
            </button>
          </div>
        </div>
        <nav className="mx-auto max-w-6xl overflow-x-auto px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto pb-2">
            {visibleTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition-colors btn-focus",
                  currentTab === t.id
                    ? "bg-gold-gradient text-zinc-950"
                    : "text-brand-gray hover:bg-brand-card hover:text-brand-text"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {currentTab === "hoje" && <TodayTab />}
        {currentTab === "agendamentos" && <AppointmentsTab />}
        {currentTab === "feedbacks" && <FeedbackModeration />}
        {currentTab === "historico" && <HistoryTab />}
        {currentTab === "clientes" && <ClientsTab />}
        {currentTab === "servicos" && <ServicesTab />}
        {currentTab === "funcionarios" && <EmployeesTab />}
        {currentTab === "bloqueios" && <BlockedTab />}
        {currentTab === "produtos" && <ProductsTab />}
        {currentTab === "config" && <ConfigTab />}
      </div>
    </main>
  );
}
