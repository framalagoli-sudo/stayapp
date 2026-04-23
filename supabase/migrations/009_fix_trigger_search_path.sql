-- Fix trigger handle_new_user: aggiunge SET search_path = public
-- Supabase richiede search_path esplicito nelle funzioni SECURITY DEFINER
-- Senza questa impostazione, auth.admin.createUser() fallisce con
-- "database error creating new user" nelle versioni recenti di Supabase.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;
