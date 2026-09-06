"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { maskPhone, unmaskPhone } from "@/lib/utils";
import {
  MoonIcon,
  SunIcon,
  MailIcon,
  LockIcon,
  UserIcon,
  PhoneIcon,
  ShieldIcon,
  GoogleIcon,
  EyeIcon,
  EyeOffIcon,
} from "@/components/icons";

export function HomeAuth() {
  const { user, loading, signIn, signInWithGoogle, signUp, role } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (role === "barber" || role === "master" || role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/me");
      }
    }
  }, [user, loading, role, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "login") {
        const res = await signIn(email.trim(), password);
        if (res.error) setError(res.error);
      } else {
        if (name.trim().length < 2) {
          setError("Informe seu nome (mínimo 2 letras).");
          return;
        }
        if (unmaskPhone(phone).length < 10) {
          setError("Informe um celular válido com DDD.");
          return;
        }
        const res = await signUp(email.trim(), password, name, unmaskPhone(phone));
        if (res.error) {
          setError(res.error);
        } else {
          setInfo(
            "Conta criada! Confira seu e-mail para confirmar (se solicitado) e faça login."
          );
          setMode("login");
          setName("");
          setPassword("");
          setPhone("");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const res = await signInWithGoogle();
      if (res.error) setError(res.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -top-32 right-1/4 h-80 w-80 rounded-full bg-brand-orange/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-brand-orange/5 blur-3xl" />

      <button
        onClick={toggleTheme}
        aria-label="Alternar tema"
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-xl border border-brand-border bg-brand-card text-brand-muted transition-colors hover:text-brand-orange btn-focus"
      >
        {theme === "dark" ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
      </button>

      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/logo.jpg"
            alt="Logo Obarber Lipe"
            width={512}
            height={512}
            priority
            className="h-28 w-28 rounded-2xl object-cover shadow-2xl ring-2 ring-brand-gold/40"
          />
          <h1 className="mt-4 text-4xl font-black tracking-tight">
            Obarber{" "}
            <span className="text-gradient-gold">Lipe</span>
          </h1>
          <p className="mt-2 text-sm text-brand-muted">
            {mode === "login"
              ? "Entre para agendar, ver seu histórico e seus planos."
              : "Crie sua conta para começar a agendar."}
          </p>
        </div>

        <div
          className="mt-8 rounded-3xl border border-brand-border bg-brand-card p-6 shadow-2xl animate-fade-in-up sm:p-8"
          style={{ animationDelay: "80ms" }}
        >
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-brand-darker p-1">
            <button
              onClick={() => {
                setMode("login");
                setError(null);
                setInfo(null);
              }}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors btn-focus ${
                mode === "login"
                  ? "bg-gold-gradient text-zinc-950"
                  : "text-brand-muted hover:text-brand-text"
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => {
                setMode("register");
                setError(null);
                setInfo(null);
              }}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors btn-focus ${
                mode === "register"
                  ? "bg-gold-gradient text-zinc-950"
                  : "text-brand-muted hover:text-brand-text"
              }`}
            >
              Criar conta
            </button>
          </div>

          <button
            onClick={() => void handleGoogle()}
            disabled={busy || (!user && loading)}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-brand-border bg-brand-darker py-3.5 text-sm font-bold text-brand-text transition-colors hover:border-brand-orange/50 btn-focus disabled:opacity-50"
          >
            <GoogleIcon className="h-5 w-5 text-brand-gold" />
            Continuar com Google
          </button>

          <div className="mt-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-brand-border" />
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
              ou com e-mail
            </span>
            <span className="h-px flex-1 bg-brand-border" />
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {mode === "register" && (
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-brand-muted">
                  Nome
                </label>
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full rounded-xl border border-brand-border bg-brand-darker py-3 pl-10 pr-4 text-sm text-brand-text placeholder:text-brand-muted/60 btn-focus"
                    required={mode === "register"}
                  />
                </div>
              </div>
            )}

            {mode === "register" && (
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-brand-muted">
                  Celular (WhatsApp)
                </label>
                <div className="relative">
                  <PhoneIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(maskPhone(e.target.value))}
                    placeholder="(11) 99999-9999"
                    className="w-full rounded-xl border border-brand-border bg-brand-darker py-3 pl-10 pr-4 text-sm text-brand-text placeholder:text-brand-muted/60 btn-focus"
                    required={mode === "register"}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-brand-muted">
                E-mail
              </label>
              <div className="relative">
                <MailIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  className="w-full rounded-xl border border-brand-border bg-brand-darker py-3 pl-10 pr-4 text-sm text-brand-text placeholder:text-brand-muted/60 btn-focus"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-brand-muted">
                Senha
              </label>
              <div className="relative">
                <LockIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-brand-border bg-brand-darker py-3 pl-10 pr-11 text-sm text-brand-text placeholder:text-brand-muted/60 btn-focus"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md text-brand-muted transition-colors hover:text-brand-orange btn-focus"
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-brand-red/30 bg-brand-red/10 px-4 py-2.5 text-sm text-brand-red">
                {error}
              </p>
            )}
            {info && (
              <p className="rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-2.5 text-sm text-brand-green">
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || (!user && loading)}
              className="w-full rounded-xl bg-gold-gradient py-3.5 text-sm font-black text-zinc-950 transition-transform hover:scale-[1.01] btn-focus disabled:opacity-50"
            >
              {busy
                ? "Aguarde..."
                : mode === "login"
                  ? "Entrar"
                  : "Criar conta"}
            </button>
          </form>

          {mode === "login" && (
            <p className="mt-4 text-center text-xs text-brand-muted">
              Ainda não tem conta?{" "}
              <button
                onClick={() => {
                  setMode("register");
                  setError(null);
                  setInfo(null);
                }}
                className="font-bold text-brand-orange hover:underline btn-focus"
              >
                Cadastre-se
              </button>
            </p>
          )}
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-brand-border bg-brand-card/60 p-4 animate-fade-in-up" style={{ animationDelay: "160ms" }}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-orange/10 text-brand-orange">
            <ShieldIcon className="h-4 w-4" />
          </span>
          <p className="text-xs leading-relaxed text-brand-muted">
            Acesso exclusivo da <strong className="text-brand-text">Obarber Lipe</strong>.
            Barbeiros e clientes entram com o e-mail de acesso. Cada profissional vê
            apenas a própria agenda e os próprios clientes.
          </p>
        </div>
      </div>
    </div>
  );
}