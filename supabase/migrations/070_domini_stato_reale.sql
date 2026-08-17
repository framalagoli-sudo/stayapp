-- Domini: tracciare lo stato REALE del collegamento, non solo quello dichiarato.
-- Prima di questa migration la route PATCH scriveva updated_at (colonna inesistente)
-- → rinominare il sottodominio rispondeva sempre 500 (PGRST204).
ALTER TABLE public.domini ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Esito dell'ultima verifica DNS/certificato: quando è stata fatta e cosa ha visto
-- (valori DNS attuali vs attesi, certificato emesso, errore Vercel). Serve alla UI
-- per dire al cliente cosa manca, invece di un generico "in attesa".
ALTER TABLE public.domini ADD COLUMN IF NOT EXISTS ultima_verifica timestamptz;
ALTER TABLE public.domini ADD COLUMN IF NOT EXISTS verifica_dettaglio jsonb;

-- Dominio gemello registrato su Vercel come redirect (apex↔www): chi collega
-- iltuosito.it deve trovare online anche www.iltuosito.it, e viceversa.
-- Serve anche alla DELETE, per rimuovere entrambi da Vercel.
ALTER TABLE public.domini ADD COLUMN IF NOT EXISTS variante_dominio text;

-- Un'entità ha UN solo sottodominio predefinito: l'unicità la garantisce il DB,
-- non il codice applicativo (prima due chiamate concorrenti potevano crearne due).
CREATE UNIQUE INDEX IF NOT EXISTS domini_subdomain_unico_idx
  ON public.domini (entity_tipo, entity_id)
  WHERE tipo = 'subdomain';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.domini TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.domini TO service_role;
GRANT SELECT ON public.domini TO anon;
