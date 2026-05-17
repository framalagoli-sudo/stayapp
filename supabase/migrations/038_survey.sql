-- Migration 038: Survey / NPS automatico
CREATE TABLE IF NOT EXISTS public.survey_risposte (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id    uuid REFERENCES public.aziende(id) ON DELETE CASCADE,
  token         uuid UNIQUE DEFAULT gen_random_uuid(),
  nome_cliente  text DEFAULT '',
  email_cliente text DEFAULT '',
  nps_score     int CHECK (nps_score BETWEEN 0 AND 10),
  commento      text DEFAULT '',
  compilato_at  timestamptz,
  created_at    timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_risposte TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_risposte TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.survey_risposte TO anon;

ALTER TABLE public.survey_risposte ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_survey_azienda ON public.survey_risposte(azienda_id);
CREATE INDEX IF NOT EXISTS idx_survey_token   ON public.survey_risposte(token);
