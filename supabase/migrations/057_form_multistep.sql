-- Sprint C — Form Builder: conditional fields + multi-step
-- Le proprietà `condizione` e `step` per ogni campo vivono già nel JSONB `campi`
-- (nessuna migrazione serve per quelle). Solo il flag form-level va aggiunto.

ALTER TABLE public.form_builder
  ADD COLUMN IF NOT EXISTS multi_step boolean DEFAULT false;

COMMENT ON COLUMN public.form_builder.multi_step IS 'Se true il form mostra i campi a pagine (step), determinati dal campo step:int su ogni campo JSONB';
