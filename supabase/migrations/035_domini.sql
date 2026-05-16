-- Domini custom e sottodomini per ogni entità
CREATE TABLE IF NOT EXISTS public.domini (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id uuid REFERENCES public.aziende(id) ON DELETE CASCADE NOT NULL,
  entity_tipo text NOT NULL CHECK (entity_tipo IN ('struttura','ristorante','attivita')),
  entity_id uuid NOT NULL,
  entity_slug text NOT NULL,
  dominio text UNIQUE NOT NULL,
  tipo text DEFAULT 'subdomain' CHECK (tipo IN ('subdomain','custom')),
  stato text DEFAULT 'attivo' CHECK (stato IN ('attivo','pending','errore')),
  vercel_domain_id text,
  dns_istruzioni jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS domini_dominio_idx ON public.domini(dominio);
CREATE INDEX IF NOT EXISTS domini_entity_idx ON public.domini(entity_tipo, entity_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.domini TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.domini TO service_role;
GRANT SELECT ON public.domini TO anon;
ALTER TABLE public.domini ENABLE ROW LEVEL SECURITY;
