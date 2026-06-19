-- 062_site_snapshots.sql
-- Snapshot/restore della CONFIG editabile di un sito (minisito, tema, pagine CMS…).
-- Il "ripristina il sito di ieri": versioni della config di un'entità, ripristinabili
-- a 1 click. Tocca solo config, NON dati transazionali (prenotazioni/contatti).

CREATE TABLE IF NOT EXISTS public.site_snapshots (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_tipo  text NOT NULL CHECK (entity_tipo IN ('struttura','ristorante','attivita')),
  entity_id    uuid NOT NULL,
  azienda_id   uuid REFERENCES public.aziende(id) ON DELETE CASCADE,
  label        text DEFAULT '',
  kind         text NOT NULL DEFAULT 'manual' CHECK (kind IN ('manual','auto_pre_restore')),
  created_by   text,
  entity_data  jsonb NOT NULL DEFAULT '{}'::jsonb,   -- colonne config dell'entità
  pagine_data  jsonb NOT NULL DEFAULT '[]'::jsonb,   -- righe della tabella pagine
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_snapshots_entity_idx
  ON public.site_snapshots (entity_tipo, entity_id, created_at DESC);

ALTER TABLE public.site_snapshots ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_snapshots TO service_role;
