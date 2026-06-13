-- Sprint B — Form Builder: automazioni post-submit

ALTER TABLE public.form_builder
  ADD COLUMN IF NOT EXISTS email_conferma_attiva  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_conferma_oggetto text    DEFAULT '',
  ADD COLUMN IF NOT EXISTS email_conferma_testo   text    DEFAULT '',
  ADD COLUMN IF NOT EXISTS tag_auto               text[]  DEFAULT '{}';

COMMENT ON COLUMN public.form_builder.email_conferma_attiva  IS 'Se true, invia email di conferma automatica al mittente dopo ogni submit';
COMMENT ON COLUMN public.form_builder.email_conferma_oggetto IS 'Oggetto email di conferma — variabili: {{nome}} {{form_nome}}';
COMMENT ON COLUMN public.form_builder.email_conferma_testo   IS 'Corpo email di conferma (testo plain) — variabili: {{nome}} {{form_nome}}';
COMMENT ON COLUMN public.form_builder.tag_auto               IS 'Tag da assegnare automaticamente al contatto CRM ad ogni submit';
