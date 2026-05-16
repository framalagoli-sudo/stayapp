-- Sprint: Form builder

CREATE TABLE IF NOT EXISTS public.form_builder (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id  uuid REFERENCES public.aziende(id) ON DELETE CASCADE NOT NULL,
  nome        text NOT NULL DEFAULT '',
  descrizione text DEFAULT '',
  campi       jsonb DEFAULT '[]',
  -- campo: { id, tipo, label, required, placeholder, opzioni[] }
  -- tipi: text | email | tel | textarea | select | checkbox | date | number
  redirect_url      text DEFAULT '',
  email_notifica    text DEFAULT '',
  attivo            boolean DEFAULT true,
  token             uuid UNIQUE DEFAULT gen_random_uuid(),
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.form_submissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id     uuid REFERENCES public.form_builder(id) ON DELETE CASCADE NOT NULL,
  azienda_id  uuid NOT NULL,
  dati        jsonb DEFAULT '{}',
  contatto_id uuid REFERENCES public.contatti(id) ON DELETE SET NULL,
  ip          text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_builder_azienda   ON public.form_builder (azienda_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form  ON public.form_submissions (form_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_az    ON public.form_submissions (azienda_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_builder    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_builder    TO service_role;
GRANT SELECT ON public.form_builder TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_submissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_submissions TO service_role;
GRANT INSERT ON public.form_submissions TO anon;

ALTER TABLE public.form_builder    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
