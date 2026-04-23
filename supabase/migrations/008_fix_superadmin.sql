-- Ripristina il ruolo super_admin per fra.malagoli@gmail.com
-- Eseguire nel SQL Editor di Supabase se il ruolo è stato perso

UPDATE profiles
SET role = 'super_admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'fra.malagoli@gmail.com'
);
