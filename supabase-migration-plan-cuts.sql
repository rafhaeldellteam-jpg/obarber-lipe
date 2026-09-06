-- ============================================================
-- Migration: débito de cortes nos planos
-- Rode no Supabase SQL Editor (uma vez só).
-- ============================================================

-- Contador de cortes já utilizados em cada assinatura
alter table public.customer_subscriptions
  add column if not exists cuts_used integer not null default 0;

-- Garante que nunca fique negativo
alter table public.customer_subscriptions
  drop constraint if exists cuts_used_non_negative;
alter table public.customer_subscriptions
  add constraint cuts_used_non_negative check (cuts_used >= 0);
