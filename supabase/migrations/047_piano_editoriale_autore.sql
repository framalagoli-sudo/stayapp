-- Migration 047: autore e ultimo modificatore su piano_editoriale

ALTER TABLE public.piano_editoriale
  ADD COLUMN IF NOT EXISTS created_by      uuid,
  ADD COLUMN IF NOT EXISTS created_by_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_by      uuid,
  ADD COLUMN IF NOT EXISTS updated_by_name text DEFAULT '';
