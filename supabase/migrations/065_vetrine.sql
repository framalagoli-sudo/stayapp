-- Migration 065: Vetrine — motore generico "collezioni + elementi"
-- Una vetrina è una collezione di elementi (progetti immobiliari, auto, immobili…)
-- appartenente a una entità. I campi variano per preset (definiti nel codice).
-- I numeri sensibili stanno in dati_privati, MAI inclusi nelle select pubbliche.

CREATE TABLE IF NOT EXISTS public.vetrine (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_tipo     text NOT NULL CHECK (entity_tipo IN ('struttura','ristorante','attivita')),
  entity_id       uuid NOT NULL,
  slug            text NOT NULL,
  titolo          text NOT NULL DEFAULT '',
  preset          text NOT NULL DEFAULT 'progetti_immobiliari',
  schema          jsonb,                                 -- override campi (null = usa il preset da codice)
  settings        jsonb NOT NULL DEFAULT '{}'::jsonb,    -- layout, filtri attivi
  status          text NOT NULL DEFAULT 'bozza' CHECK (status IN ('bozza','pubblicata')),
  ordine          integer NOT NULL DEFAULT 0,
  seo_title       text DEFAULT '',
  seo_description text DEFAULT '',
  og_image_url    text DEFAULT '',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(entity_tipo, entity_id, slug)
);

CREATE TABLE IF NOT EXISTS public.vetrina_elementi (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vetrina_id      uuid NOT NULL REFERENCES public.vetrine(id) ON DELETE CASCADE,
  entity_tipo     text NOT NULL CHECK (entity_tipo IN ('struttura','ristorante','attivita')),
  entity_id       uuid NOT NULL,                         -- denormalizzato dalla vetrina (scoping/query)
  slug            text NOT NULL DEFAULT '',
  titolo          text NOT NULL DEFAULT '',
  copertina_url   text DEFAULT '',
  valore_primario numeric(14,2),                         -- colonna calda per sort/filtro (significato dal preset)
  stato_pubblico  text DEFAULT '',                       -- colonna calda per filtro (es. in_raccolta|venduto)
  dati            jsonb NOT NULL DEFAULT '{}'::jsonb,    -- campi pubblici
  dati_privati    jsonb NOT NULL DEFAULT '{}'::jsonb,    -- campi gated: MAI nelle select pubbliche
  immagini        jsonb NOT NULL DEFAULT '[]'::jsonb,    -- galleria [url]
  status          text NOT NULL DEFAULT 'bozza' CHECK (status IN ('bozza','pubblicata')),
  ordine          integer NOT NULL DEFAULT 0,
  seo_title       text DEFAULT '',
  seo_description text DEFAULT '',
  og_image_url    text DEFAULT '',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(vetrina_id, slug)
);

CREATE INDEX IF NOT EXISTS vetrine_entity_idx          ON public.vetrine(entity_tipo, entity_id);
CREATE INDEX IF NOT EXISTS vetrina_elementi_vetrina_idx ON public.vetrina_elementi(vetrina_id);
CREATE INDEX IF NOT EXISTS vetrina_elementi_entity_idx  ON public.vetrina_elementi(entity_tipo, entity_id);
CREATE INDEX IF NOT EXISTS vetrina_elementi_valore_idx  ON public.vetrina_elementi(vetrina_id, valore_primario);
CREATE INDEX IF NOT EXISTS vetrina_elementi_dati_gin    ON public.vetrina_elementi USING gin (dati);

-- updated_at automatico (una funzione condivisa dalle due tabelle)
CREATE OR REPLACE FUNCTION public.vetrine_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS vetrine_updated_at ON public.vetrine;
CREATE TRIGGER vetrine_updated_at BEFORE UPDATE ON public.vetrine
  FOR EACH ROW EXECUTE FUNCTION public.vetrine_set_updated_at();

DROP TRIGGER IF EXISTS vetrina_elementi_updated_at ON public.vetrina_elementi;
CREATE TRIGGER vetrina_elementi_updated_at BEFORE UPDATE ON public.vetrina_elementi
  FOR EACH ROW EXECUTE FUNCTION public.vetrine_set_updated_at();

-- Grants + RLS (nota 19). Il server usa service_role (bypassa RLS); il frontend
-- pubblico legge tramite endpoint server che selezionano SOLO le colonne pubbliche.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vetrine          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vetrine          TO service_role;
GRANT SELECT                         ON public.vetrine          TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vetrina_elementi TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vetrina_elementi TO service_role;
GRANT SELECT                         ON public.vetrina_elementi TO anon;

ALTER TABLE public.vetrine          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vetrina_elementi ENABLE ROW LEVEL SECURITY;
