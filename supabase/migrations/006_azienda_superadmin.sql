-- ============================================================
-- StayApp — Azienda default per il super_admin Francesco
-- Eseguire nel SQL Editor di Supabase
-- ============================================================

DO $$
DECLARE
  az_id uuid;
BEGIN
  -- Crea l'azienda principale di sviluppo/demo
  INSERT INTO aziende (ragione_sociale, email, moduli, piano)
  VALUES (
    'StayApp Development',
    'fra.malagoli@gmail.com',
    '{"struttura":true,"ristorante":true}',
    'enterprise'
  )
  RETURNING id INTO az_id;

  -- Collega il profilo super_admin all'azienda
  UPDATE profiles
  SET azienda_id = az_id
  WHERE role = 'super_admin'
    AND azienda_id IS NULL;

  -- Collega tutte le strutture orfane all'azienda
  UPDATE properties
  SET azienda_id = az_id
  WHERE azienda_id IS NULL;

  RAISE NOTICE 'Azienda creata con ID: %', az_id;
END $$;
