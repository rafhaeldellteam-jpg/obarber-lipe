"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { MoonIcon, SunIcon } from "@/components/icons";

export function Header() {
  const { user, role, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const isStaff = role === "barber" || role === "master" || role === "admin";
  const painelHref = user ? (isStaff ? "/admin" : "/me") : "/";

  return (
    <header className="sticky top-0 z-50 border-b border-brand-border bg-brand-black/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href={user ? painelHref : "/"} className="flex items-center gap-2 btn-focus rounded-lg">
          <Image
            src="/icon-192.png"
            alt="Obarber Lipe"
            width={36}
            height={36}
            priority
            className="h-9 w-9 rounded-full"
          />
          <span className="text-lg font-bold tracking-tight">
            Obarber <span className="text-brand-gold">Lipe</span>
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label="Alternar tema"
            className="grid h-10 w-10 place-items-center rounded-lg border border-brand-border text-brand-muted transition-colors hover:text-brand-orange btn-focus"
          >
            {theme === "dark" ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </button>

          {user ? (
            <>
              <Link
                href={painelHref}
                className="hidden rounded-lg border border-brand-border px-3 py-2 text-sm font-semibold text-brand-text btn-focus sm:block"
              >
                {isStaff ? "Painel" : "Meus horários"}
              </Link>
              <button
                onClick={() => void signOut()}
                className="rounded-lg bg-gold-gradient px-4 py-2 text-sm font-bold text-zinc-950 transition-transform hover:scale-[1.03] btn-focus"
              >
                Sair
              </button>
            </>
          ) : (
            <Link
              href="/"
              className="rounded-lg bg-gold-gradient px-4 py-2 text-sm font-bold text-zinc-950 transition-transform hover:scale-[1.03] btn-focus"
            >
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}