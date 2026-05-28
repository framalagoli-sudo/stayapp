-- Aggiunge campo design_url al piano editoriale
-- Usato per collegare un design (Canva embed URL, Figma, Adobe Express…)
-- con anteprima iframe inline nel pannello.

ALTER TABLE public.piano_editoriale
  ADD COLUMN IF NOT EXISTS design_url text DEFAULT '';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.piano_editoriale TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.piano_editoriale TO service_role;
