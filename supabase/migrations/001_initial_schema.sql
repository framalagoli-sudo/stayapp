-- ============================================================
-- StayApp — schema iniziale
-- ============================================================

-- Piani disponibili
create type plan_type as enum ('base', 'standard', 'premium', 'enterprise');

-- Ruoli utente
create type user_role as enum ('super_admin', 'admin_gruppo', 'admin_struttura', 'staff', 'ospite');

-- Stato richiesta
create type request_status as enum ('open', 'in_progress', 'resolved', 'cancelled');

-- Tipo richiesta
create type request_type as enum ('reception', 'maintenance', 'housekeeping', 'other');

-- ============================================================
-- Gruppi (multi-property)
-- ============================================================
create table groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  plan        plan_type not null default 'standard',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- Strutture ricettive
-- ============================================================
create table properties (
  id               uuid primary key default gen_random_uuid(),
  group_id         uuid references groups(id) on delete set null,
  slug             text not null unique,          -- es. "hotel-bellavista"
  name             text not null,
  description      text,
  address          text,
  phone            text,
  email            text,
  wifi_name        text,
  wifi_password    text,
  checkin_time     text,
  checkout_time    text,
  rules            text,
  amenities        jsonb default '[]',
  logo_url         text,
  cover_url        text,
  plan             plan_type not null default 'base',
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index on properties (slug);
create index on properties (group_id);

-- ============================================================
-- Profili utente (extension di auth.users)
-- ============================================================
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         user_role not null default 'staff',
  full_name    text,
  property_id  uuid references properties(id) on delete set null,
  group_id     uuid references groups(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- Trigger: crea il profilo automaticamente al signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- Richieste degli ospiti
-- ============================================================
create table requests (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references properties(id) on delete cascade,
  room         text,
  type         request_type not null default 'reception',
  message      text not null,
  status       request_status not null default 'open',
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index on requests (property_id, status);
create index on requests (created_at desc);

-- ============================================================
-- RLS policies
-- ============================================================
alter table groups     enable row level security;
alter table properties enable row level security;
alter table profiles   enable row level security;
alter table requests   enable row level security;

-- profiles: ogni utente vede solo il proprio profilo
create policy "self profile" on profiles
  for all using (auth.uid() = id);

-- super_admin vede tutto via service role (bypass RLS nel server)

-- properties: visibili a chi è associato
create policy "property access" on properties
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and (
          p.role = 'super_admin'
          or p.property_id = properties.id
          or (p.role = 'admin_gruppo' and p.group_id = properties.group_id)
        )
    )
  );

-- requests: lettura per staff/admin della struttura
create policy "requests read" on requests
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and (p.role = 'super_admin' or p.property_id = requests.property_id)
    )
  );

-- requests: insert aperto (ospiti non autenticati — gestito tramite service role nel server)
-- Il server usa service role key → bypassa RLS → ok
