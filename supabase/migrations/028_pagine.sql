CREATE TABLE IF NOT EXISTS public.pagine (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_tipo     text NOT NULL CHECK (entity_tipo IN ('struttura','ristorante','attivita')),
  entity_id       uuid NOT NULL,
  parent_id       uuid REFERENCES public.pagine(id) ON DELETE SET NULL,
  slug            text NOT NULL,
  titolo          text NOT NULL DEFAULT '',
  status          text NOT NULL DEFAULT 'bozza' CHECK (status IN ('bozza','pubblicata')),
  nel_menu        boolean NOT NULL DEFAULT true,
  ordine          integer NOT NULL DEFAULT 0,
  seo_title       text DEFAULT '',
  seo_description text DEFAULT '',
  og_image_url    text DEFAULT '',
  blocks          jsonb DEFAULT '[]'::jsonb,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(entity_tipo, entity_id, slug)
);

CREATE INDEX IF NOT EXISTS pagine_entity_idx ON public.pagine(entity_tipo, entity_id);
CREATE INDEX IF NOT EXISTS pagine_parent_idx ON public.pagine(parent_id);
CREATE INDEX IF NOT EXISTS pagine_ordine_idx ON public.pagine(entity_tipo, entity_id, ordine);

CREATE OR REPLACE FUNCTION public.pagine_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS pagine_updated_at ON public.pagine;
CREATE TRIGGER pagine_updated_at
  BEFORE UPDATE ON public.pagine
  FOR EACH ROW EXECUTE FUNCTION public.pagine_set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagine TO service_role;
GRANT SELECT ON public.pagine TO anon;
ALTER TABLE public.pagine ENABLE ROW LEVEL SECURITY;
