-- ============================================================
-- Migration: log de erros do frontend
-- Rode no Supabase SQL Editor (uma vez só).
-- ============================================================

create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  message text not null,
  stack text,
  path text,
  user_agent text
);

-- Consulta rápida por erros recentes
create index if not exists error_logs_created_at_idx
  on public.error_logs (created_at desc);

-- RLS: nenhuma policy pública — somente a service role
-- (usada pela rota /api/log-error) grava e lê.
alter table public.error_logs enable row level security;
