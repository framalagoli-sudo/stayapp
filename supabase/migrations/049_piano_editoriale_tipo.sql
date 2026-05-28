-- Aggiunge tipo contenuto e riferimento interno al piano editoriale
ALTER TABLE public.piano_editoriale
  ADD COLUMN IF NOT EXISTS tipo_contenuto text DEFAULT 'post',
  ADD COLUMN IF NOT EXISTS ref_id         uuid,
  ADD COLUMN IF NOT EXISTS ref_tipo       text;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.piano_editoriale TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.piano_editoriale TO service_role;
