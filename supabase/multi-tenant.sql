-- Multi-casamento / subcontas Asaas.
-- Execute depois de supabase/schema.sql.

create table if not exists weddings (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  couple_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists asaas_accounts (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null unique references weddings(id) on delete cascade,
  asaas_account_id text,
  asaas_wallet_id text,
  api_key_ciphertext text not null,
  status text not null default 'pending' check (status in ('pending','active','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payouts (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete restrict,
  amount numeric(10,2) not null check (amount > 0),
  destination_type text not null check (destination_type in ('PIX','BANK_ACCOUNT')),
  destination_key_ciphertext text,
  destination_key_type text check (destination_key_type in ('CPF','CNPJ','EMAIL','PHONE','EVP')),
  external_reference text unique not null,
  asaas_transfer_id text,
  status text not null default 'requested' check (status in ('requested','pending','done','failed','cancelled')),
  failure_reason text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists wedding_users (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  email text not null,
  password_hash text not null,
  role text not null default 'owner' check (role in ('owner','admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (wedding_id, email)
);

insert into weddings (slug, couple_name)
values ('marina-gabriel', 'Marina & Gabriel')
on conflict (slug) do nothing;

alter table gift_orders add column if not exists wedding_id uuid references weddings(id);
alter table gift_orders add column if not exists guest_name_normalized text;
update gift_orders
set wedding_id = (select id from weddings where slug = 'marina-gabriel')
where wedding_id is null;
alter table gift_orders alter column wedding_id set not null;

alter table weddings enable row level security;
alter table asaas_accounts enable row level security;
alter table payouts enable row level security;
alter table wedding_users enable row level security;
alter table payouts add column if not exists destination_key_ciphertext text;

-- O backend usa a chave SUPABASE_SERVICE_ROLE_KEY através do REST API.
-- Em projetos onde as tabelas foram criadas por outro role, os grants
-- explícitos abaixo são necessários mesmo com o RLS habilitado.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.weddings, public.asaas_accounts, public.payouts, public.wedding_users, public.gifts, public.gift_orders, public.webhook_events to service_role;
grant usage, select on all sequences in schema public to service_role;

-- As tabelas de credenciais e saques ficam acessíveis somente pelo backend
-- usando SUPABASE_SERVICE_ROLE_KEY até a autenticação das noivas ser criada.

