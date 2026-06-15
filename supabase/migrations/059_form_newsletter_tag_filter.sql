-- Form Builder: newsletter optin per contatti CRM
-- Newsletter: tag_filter per invio segmentato
-- (eseguita manualmente il 2026-06-14, file migration aggiunto a posteriori)

ALTER TABLE public.form_builder
  ADD COLUMN IF NOT EXISTS newsletter_optin boolean DEFAULT false;

COMMENT ON COLUMN public.form_builder.newsletter_optin
  IS 'Se true, chi compila il form viene iscritto alla newsletter se ha dato consenso GDPR';

ALTER TABLE public.newsletters
  ADD COLUMN IF NOT EXISTS tag_filter text[] DEFAULT NULL;

COMMENT ON COLUMN public.newsletters.tag_filter
  IS 'Se valorizzato, invia solo ai contatti che hanno almeno uno di questi tag';
