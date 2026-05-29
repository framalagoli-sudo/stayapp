-- Campagne editoriali
CREATE TABLE IF NOT EXISTS public.pe_campagne (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  azienda_id  uuid REFERENCES aziende(id) ON DELETE CASCADE NOT NULL,
  nome        text NOT NULL DEFAULT '',
  colore      text DEFAULT '#6366f1',
  data_inizio date,
  data_fine   date,
  descrizione text DEFAULT '',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pe_campagne TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pe_campagne TO service_role;
ALTER TABLE public.pe_campagne ENABLE ROW LEVEL SECURITY;

-- Aggiungo campagna_id a piano_editoriale
ALTER TABLE public.piano_editoriale
  ADD COLUMN IF NOT EXISTS campagna_id uuid REFERENCES pe_campagne(id) ON DELETE SET NULL;
