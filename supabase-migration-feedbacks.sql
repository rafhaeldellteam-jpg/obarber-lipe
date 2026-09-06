-- ============================================================
-- Migration: Feedbacks (Obarber Lipe)
-- Execute no Supabase Dashboard > SQL Editor
-- ============================================================

-- 1) Tabela de feedbacks
create table if not exists public.feedbacks (
  id            uuid        primary key default gen_random_uuid(),
  customer_id   uuid        not null references public.customers(id) on delete cascade,
  customer_name text        not null,
  rating        integer     not null check (rating between 1 and 5),
  comment       text,
  photo_path    text,       -- path no bucket privado "feedbacks" (ex.: "<email-uid>/<uuid>.jpg")
  status        text        not null default 'pendente'
                            check (status in ('pendente','aprovado','recusado')),
  created_at    timestamptz not null default now()
);

create index if not exists feedbacks_status_created_idx
  on public.feedbacks (status, created_at desc);

create index if not exists feedbacks_customer_id_idx
  on public.feedbacks (customer_id);

-- 2) Row Level Security
alter table public.feedbacks enable row level security;

-- Leitura pública: somente aprovados
drop policy if exists "feedbacks_select_aprovados" on public.feedbacks;
create policy "feedbacks_select_aprovados"
  on public.feedbacks for select
  using (status = 'aprovado');

-- Leitura do próprio cliente (qualquer status)
drop policy if exists "feedbacks_select_proprio" on public.feedbacks;
create policy "feedbacks_select_proprio"
  on public.feedbacks for select
  using (
    exists (
      select 1 from public.customers c
      where c.id = feedbacks.customer_id
        and lower(c.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

-- Inserção: apenas o próprio cliente autenticado
drop policy if exists "feedbacks_insert_proprio" on public.feedbacks;
create policy "feedbacks_insert_proprio"
  on public.feedbacks for insert
  with check (
    exists (
      select 1 from public.customers c
      where c.id = feedbacks.customer_id
        and lower(c.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

-- Não há policy de UPDATE/DELETE para usuários comuns:
-- moderação acontece apenas via rotas /api/admin/* (service role ignora RLS).

-- ============================================================
-- 3) Bucket de Storage PRIVADO "feedbacks"
--    Execute no Supabase Dashboard > Storage > New bucket:
--      Nome: feedbacks
--      Público: NÃO
--      Tamanho máximo: 5 MB
--      MIME types permitidos: image/jpeg, image/png, image/webp
--
--    Depois, em Storage > Policies (bucket feedbacks), crie:
--
--    INSERT (upload pelo próprio cliente):
--      for insert to authenticated with check (
--        bucket_id = 'feedbacks'
--        and (storage.foldername(name))[1] = auth.uid()::text
--      )
--
--    SELECT (ler o próprio arquivo):
--      for select to authenticated using (
--        bucket_id = 'feedbacks'
--        and (storage.foldername(name))[1] = auth.uid()::text
--      )
--
--    Obs.: a pasta é o UID do usuário Supabase; as fotos de feedbacks aprovados
--    são exibidas via signed URL gerada pelo servidor (rota /api/feedbacks).
-- ============================================================
