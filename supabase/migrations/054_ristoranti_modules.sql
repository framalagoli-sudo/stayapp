-- Aggiunge colonna modules a ristoranti
-- Era stata aggiunta solo a properties (migration 003), mai a ristoranti

ALTER TABLE ristoranti
  ADD COLUMN IF NOT EXISTS modules jsonb DEFAULT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ristoranti TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ristoranti TO service_role;
