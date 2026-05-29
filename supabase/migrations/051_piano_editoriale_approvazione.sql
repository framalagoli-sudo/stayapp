ALTER TABLE public.piano_editoriale
  ADD COLUMN IF NOT EXISTS richiede_approvazione boolean DEFAULT false;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.piano_editoriale TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.piano_editoriale TO service_role;
