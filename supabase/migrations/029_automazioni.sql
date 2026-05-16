-- Sprint 5: Email automation sequences
-- Tabelle: automazioni (regole) + automazioni_log (esecuzioni)

CREATE TABLE IF NOT EXISTS public.automazioni (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id     uuid REFERENCES public.aziende(id) ON DELETE CASCADE NOT NULL,
  entity_tipo    text NOT NULL CHECK (entity_tipo IN ('struttura','ristorante','attivita')),
  entity_id      uuid NOT NULL,
  nome           text NOT NULL DEFAULT '',
  trigger_evento text NOT NULL CHECK (trigger_evento IN ('nuova_prenotazione','nuovo_contatto','pre_visita','post_visita')),
  attiva         boolean DEFAULT true,
  steps          jsonb DEFAULT '[]',
  -- steps: [{ delay_ore, subject, heading, text, cta_text, cta_url }]
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.automazioni_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automazione_id uuid REFERENCES public.automazioni(id) ON DELETE CASCADE NOT NULL,
  step_index     int NOT NULL DEFAULT 0,
  source_tipo    text,              -- 'prenotazione' | 'contatto'
  source_id      uuid,
  contact_email  text NOT NULL,
  contact_nome   text,
  vars           jsonb DEFAULT '{}',
  scheduled_at   timestamptz NOT NULL,
  sent_at        timestamptz,
  status         text DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  error_msg      text,
  created_at     timestamptz DEFAULT now()
);

-- Indice per il runner: cerca pending scaduti
CREATE INDEX IF NOT EXISTS idx_automazioni_log_pending
  ON public.automazioni_log (scheduled_at)
  WHERE status = 'pending';

-- Grants (obbligatori da ottobre 2026)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automazioni     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automazioni     TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automazioni_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automazioni_log TO service_role;

ALTER TABLE public.automazioni     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automazioni_log ENABLE ROW LEVEL SECURITY;
