-- Logo "negativo" per sfondi scuri (footer scuro, header scuro).
-- Coppia di logo_url: sullo sfondo scuro si usa logo_dark_url (fallback a logo_url).
-- Eseguire a mano su Supabase Dashboard → SQL Editor.

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS logo_dark_url text;
ALTER TABLE public.ristoranti  ADD COLUMN IF NOT EXISTS logo_dark_url text;
ALTER TABLE public.attivita    ADD COLUMN IF NOT EXISTS logo_dark_url text;

-- Nessun GRANT aggiuntivo: i permessi sono a livello di tabella e coprono le nuove colonne.
