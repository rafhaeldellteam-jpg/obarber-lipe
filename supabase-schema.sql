-- ============================================================
-- Obarber Lipe — SETUP COMPLETO DO BANCO
-- ------------------------------------------------------------
-- IMPORTANTE: este script REMOVE as tabelas antigas do projeto
-- (barbearia-dreamer e afins) e cria as tabelas do Obarber Lipe.
-- Execute o arquivo INTEIRO no SQL Editor do Supabase:
--   Supabase Dashboard > SQL Editor > New query > cole tudo > Run
-- ============================================================

-- ------------------------------------------------------------
-- 1. Remove tudo que existia antes (projeto antigo)
-- ------------------------------------------------------------
drop table if exists public.customer_subscriptions cascade;
drop table if exists public.customer_orders cascade;
drop table if exists public.product_catalog cascade;
drop table if exists public.products cascade;
drop table if exists public.calendar_tokens cascade;
drop table if exists public.plans cascade;
drop table if exists public.customers cascade;
drop table if exists public.appointments cascade;
drop table if exists public.blocked_slots cascade;
drop table if exists public.barbers cascade;
drop table if exists public.services cascade;
drop table if exists public.employees cascade;
drop table if exists public.plan_catalog cascade;
drop table if exists public.clients cascade;
drop table if exists public.reviews cascade;
drop table if exists public.site_users cascade;
drop table if exists public.settings cascade;
drop table if exists public.gallery cascade;

-- ------------------------------------------------------------
-- 2. Tabelas do Obarber Lipe
-- ------------------------------------------------------------

-- Serviços oferecidos
create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  duration_minutes integer not null default 30,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Funcionários (barbeiros) — e-mail vincula a conta de acesso
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique,
  phone text,
  specialty text,
  color text default '#f97316',
  google_client_id text,        -- credencial OAuth do Google do próprio barbeiro
  google_client_secret text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Agendamentos
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_phone text not null,
  client_email text,                 -- e-mail do cliente autenticado (painel do cliente)
  employee_id uuid references public.employees(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  appointment_date date not null,
  appointment_time time not null,
  status text not null default 'pendente' check (status in ('pendente','confirmado','concluido','cancelado')),
  notes text,
  calendar_event_id text,            -- evento criado no Google Agenda do barbeiro
  created_at timestamptz not null default now()
);

-- Evita reservar o mesmo horário do mesmo profissional
create unique index appointments_employee_time_unique
  on public.appointments (employee_id, appointment_date, appointment_time)
  where status in ('pendente','confirmado');

-- Bloqueios de agenda (dia inteiro ou horário específico)
create table public.blocked_slots (
  id uuid primary key default gen_random_uuid(),
  block_date date not null,
  block_time time,
  reason text,
  employee_id uuid references public.employees(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Clientes da barbearia (vinculados ao barbeiro que atende)
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text unique,
  employee_id uuid references public.employees(id) on delete set null,
  notes text,
  signup_method text not null default 'local' check (signup_method in ('local','google')),
  created_at timestamptz not null default now()
);

-- Catálogo de planos (assinaturas)
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  duration_days integer not null default 30,       -- validade do plano
  cuts_per_period integer not null default 1,       -- cortes inclusos no período
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Assinaturas de plano dos clientes
create table public.customer_subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  status text not null default 'aguardando' check (status in ('aguardando','ativo','pausado','cancelado','recusado')),
  start_date date,          -- só preenchido quando o barbeiro aprova
  end_date date,            -- start_date + duration_days do plano ao aprovar
  requested_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Catálogo de produtos (venda na barbearia)
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Pedidos (produtos solicitados pelo cliente e aprovados pelo barbeiro)
create table public.customer_orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  description text not null,
  amount numeric(10,2) not null default 0,
  status text not null default 'pendente' check (status in ('pendente','aguardando','aprovado','recusado','pago','cancelado')),
  created_at timestamptz not null default now()
);

-- Conexão com o Google Agenda de cada barbeiro (tokens, um por funcionário)
create table public.calendar_tokens (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id) on delete cascade,
  google_email text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Configurações da barbearia
create table public.settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. Segurança / RLS
-- ------------------------------------------------------------
alter table public.services enable row level security;
alter table public.employees enable row level security;
alter table public.appointments enable row level security;
alter table public.blocked_slots enable row level security;
alter table public.settings enable row level security;
alter table public.customers enable row level security;
alter table public.plans enable row level security;
alter table public.customer_subscriptions enable row level security;
alter table public.customer_orders enable row level security;
alter table public.products enable row level security;
alter table public.calendar_tokens enable row level security;

-- Serviços, funcionários, planos e produtos: todo mundo pode VER (site público)
create policy "services leitura pública" on public.services
  for select using (true);

create policy "employees leitura pública" on public.employees
  for select using (true);

create policy "plans leitura pública" on public.plans
  for select using (active = true);

create policy "products leitura pública" on public.products
  for select using (active = true);

-- Bloqueios e settings: todo mundo pode VER (para calcular disponibilidade)
create policy "blocked_slots leitura pública" on public.blocked_slots
  for select using (true);

create policy "settings leitura pública" on public.settings
  for select using (true);

-- Agendamento: qualquer pessoa pode CRIAR pelo site (status inicial pendente)
create policy "appointments inserção anônima" on public.appointments
  for insert with check (true);

-- Agendamentos: apenas usuários logados conseguem LER/ALTERAR (painel admin)
create policy "appointments leitura somente logado" on public.appointments
  for select using (auth.role() = 'authenticated');

create policy "appointments atualização somente logado" on public.appointments
  for update using (auth.role() = 'authenticated');

-- Cliente autenticado lê os PRÓPRIOS agendamentos (painel do cliente)
create policy "appointments leitura própria" on public.appointments
  for select using (auth.role() = 'authenticated' and client_email = auth.jwt() ->> 'email');

-- Clientes: o próprio cliente e quem tem conta no painel
create policy "customers leitura" on public.customers
  for select using (auth.role() = 'authenticated');

-- Assinaturas e pedidos: apenas logados
create policy "subscriptions leitura" on public.customer_subscriptions
  for select using (auth.role() = 'authenticated');

create policy "orders leitura" on public.customer_orders
  for select using (auth.role() = 'authenticated');

-- Demais escritas do painel são feitas pelo servidor com a SECRET KEY,
-- que ignora o RLS automaticamente (sem policies adicionais).
-- Lembrando: NUNCA exponha a secret key no frontend.

-- ------------------------------------------------------------
-- 4. Dados iniciais
-- ------------------------------------------------------------

insert into public.settings (key, value) values
  ('working_hours_start', '09:00'),
  ('working_hours_end', '19:00'),
  ('interval_minutes', '30')
on conflict (key) do nothing;

insert into public.employees (name, email, phone, specialty, color, google_client_id, google_client_secret) values
  ('Felipe (banha)', 'comercial.barberlipe@gmail.com', '5511913347390', 'Corte, barba e navalha', '#f97316',
   'COLE_AQUI_GOOGLE_CLIENT_ID',
   'COLE_AQUI_GOOGLE_CLIENT_SECRET');

insert into public.employees (name, email, phone, specialty, color, google_client_id, google_client_secret) values
  ('Lucas (Pesado)', 'comercial.lucasbarber@gmail.com', '5511913347390', 'Corte e degrad', '#ea580c',
   'COLE_AQUI_GOOGLE_CLIENT_ID_2',
   'COLE_AQUI_GOOGLE_CLIENT_SECRET_2');

insert into public.services (name, description, price, duration_minutes, sort_order) values
  ('Corte de Cabelo', 'Corte moderno ou clássico com acabamento na navalha.', 40.00, 40, 1),
  ('Barba', 'Barba completa com toalha quente, navalha e finalização.', 30.00, 30, 2),
  ('Corte + Barba', 'Combo completo com atendimento premium.', 65.00, 60, 3),
  ('Sobrancelha', 'Desenho e alinhamento da sobrancelha.', 15.00, 15, 4),
  ('Foto-Sul', 'Finalização com secagem e estilização para eventos.', 25.00, 25, 5);

insert into public.plans (name, description, price, duration_days, cuts_per_period, sort_order) values
  ('Plano Mensal 4 Cortes', '4 cortes por mês com preço fixo.', 140.00, 30, 4, 1),
  ('Plano Mensal 2 Cortes', '2 cortes por mês com preço fixo.', 75.00, 30, 2, 2),
  ('Corte + Barba Mensal', '2 combos completos no mês.', 120.00, 30, 2, 3);

insert into public.products (name, description, price, sort_order) values
  ('Pomada Modeladora', 'Fixação forte para o dia a dia.', 35.00, 1),
  ('Óleo para Barba', 'Hidratação e maciez da barba.', 45.00, 2),
  ('Shampoo Anticaspa', 'Higiene e controle da oleosidade.', 30.00, 3),
  ('Kit Barba Completo', 'Óleo + balm + pente exclusivo.', 89.00, 4);

-- Índice para o isolamento por barbeiro na consulta de tokens
create unique index calendar_tokens_employee_unique
  on public.calendar_tokens (employee_id);

-- ------------------------------------------------------------
-- Fim. Agora rode o deploy e crie o admin em /admin/register.
-- ------------------------------------------------------------