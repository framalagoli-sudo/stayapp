-- Sprint A — Form Security + GDPR Consent Log

-- Aggiunge tracciabilità del consenso GDPR alle submissions
ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS consenso_dato       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS consenso_privacy_url text    DEFAULT '';

-- Aggiunge ip (era presente in codice ma mancava nella migration originale)
ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS ip text DEFAULT '';

COMMENT ON COLUMN public.form_submissions.consenso_dato       IS 'true se il campo consenso GDPR era presente nel form e fu spuntato al momento del submit';
COMMENT ON COLUMN public.form_submissions.consenso_privacy_url IS 'URL della privacy policy a cui il consenso si riferisce';
COMMENT ON COLUMN public.form_submissions.ip                   IS 'IP del client al momento del submit (art. 7 GDPR — prova consenso)';
