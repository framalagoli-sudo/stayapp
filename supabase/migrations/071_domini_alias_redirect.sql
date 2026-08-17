-- Rinominare il proprio indirizzo non deve rompere ciò che è già in giro:
-- QR stampati, biglietti da visita, link indicizzati. Il vecchio indirizzo
-- sopravvive come 'alias' e reindirizza in modo permanente al nuovo.
ALTER TABLE public.domini DROP CONSTRAINT IF EXISTS domini_tipo_check;
ALTER TABLE public.domini ADD CONSTRAINT domini_tipo_check
  CHECK (tipo IN ('subdomain', 'custom', 'alias'));

-- Dominio di destinazione del redirect (valorizzato solo sugli alias).
ALTER TABLE public.domini ADD COLUMN IF NOT EXISTS redirect_a text;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.domini TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.domini TO service_role;
GRANT SELECT ON public.domini TO anon;
