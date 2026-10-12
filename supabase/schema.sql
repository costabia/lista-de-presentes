create table if not exists gifts (id text primary key, slug text unique not null, name text not null, description text, image_url text, price numeric(10,2) not null, category text, active boolean default true, max_purchases integer, created_at timestamptz default now());
create table if not exists gift_orders (id uuid primary key default gen_random_uuid(), gift_id text references gifts(id), guest_name text, guest_message text, amount numeric(10,2) not null, status text not null default 'pending' check (status in ('pending','paid','canceled','refunded')), asaas_payment_id text, asaas_payment_link_id text, external_reference text unique not null, created_at timestamptz default now(), paid_at timestamptz);
create table if not exists webhook_events (id text primary key, event_type text not null, received_at timestamptz default now());
alter table gifts enable row level security; alter table gift_orders enable row level security; alter table webhook_events enable row level security;

-- Keep the payment foreign key valid for the gifts displayed by lib/gifts.ts.
insert into gifts (id, slug, name, description, image_url, price, category, active, max_purchases)
values
  ('breakfast', 'cafe-da-manha', 'Café da manhã dos recém-casados', 'Para começar um dia sem pressa.', 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=85', 80, 'gastronomia', true, null),
  ('drinks', 'drinks-na-lua-de-mel', 'Drinks na lua de mel', 'Um brinde aos nossos dias juntos.', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1200&q=85', 120, 'lua-de-mel', true, null),
  ('dinner', 'jantar-romantico', 'Jantar romântico', 'Uma noite para guardar na memória.', 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=85', 250, 'gastronomia', true, null),
  ('massage', 'massagem-para-o-casal', 'Massagem para o casal', 'Pausa, cuidado e tranquilidade.', 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=85', 300, 'bem-estar', true, null),
  ('special-tour', 'passeio-especial', 'Passeio especial', 'Para descobrir um lugar novo.', 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=85', 400, 'lua-de-mel', true, null),
  ('candle-dinner', 'jantar-a-luz-de-velas', 'Jantar à luz de velas', 'Com sabor e uma pitada de romance.', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=85', 450, 'gastronomia', true, null),
  ('special-night', 'uma-noite-especial', 'Uma noite especial da lua de mel', 'Uma hospedagem para celebrar.', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85', 600, 'lua-de-mel', true, null),
  ('boat', 'passeio-de-barco', 'Passeio de barco', 'Mar, sol e novos horizontes.', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=85', 750, 'lua-de-mel', true, null),
  ('flights', 'ajuda-com-as-passagens', 'Ajuda com as passagens', 'Para nos levar até nosso próximo destino.', 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=85', 1000, 'viagem', true, null),
  ('surprise', 'experiencia-surpresa', 'Experiência surpresa', 'Uma história que ainda vamos descobrir.', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85', 1500, 'viagem', true, 1)
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  description = excluded.description,
  image_url = excluded.image_url,
  price = excluded.price,
  category = excluded.category,
  active = excluded.active,
  max_purchases = excluded.max_purchases;
