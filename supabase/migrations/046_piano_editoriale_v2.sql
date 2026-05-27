-- Piano editoriale v2: labels, pillar, stato in_revisione

ALTER TABLE public.piano_editoriale
  ADD COLUMN IF NOT EXISTS labels text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pillar text   DEFAULT '';

ALTER TABLE public.piano_editoriale
  DROP CONSTRAINT IF EXISTS piano_editoriale_stato_check;

ALTER TABLE public.piano_editoriale
  ADD CONSTRAINT piano_editoriale_stato_check
  CHECK (stato IN ('bozza', 'pianificato', 'in_revisione', 'pubblicato'));
