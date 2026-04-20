-- ============================================================
-- Fix 1: Ricrea il trigger per la creazione automatica del profilo
-- Da eseguire nel SQL Editor di Supabase
-- ============================================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- Fix 2: Aggiunge policy UPDATE per properties
-- Necessaria perché la policy originale copre solo SELECT
-- ============================================================

drop policy if exists "property update" on properties;

create policy "property update" on properties
  for update using (
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
