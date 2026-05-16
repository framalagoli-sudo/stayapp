-- Sprint: Piano editoriale social

CREATE TABLE IF NOT EXISTS public.piano_editoriale (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id       uuid REFERENCES public.aziende(id) ON DELETE CASCADE NOT NULL,
  titolo           text DEFAULT '',
  testo            text DEFAULT '',
  immagine_url     text DEFAULT '',
  canali           text[] DEFAULT '{}',
  -- valori canali: instagram | facebook | linkedin | tiktok | x | google_business
  data_pianificata timestamptz,
  stato            text DEFAULT 'bozza'
    CHECK (stato IN ('bozza','pianificato','pubblicato')),
  note             text DEFAULT '',
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_piano_editoriale_azienda ON public.piano_editoriale (azienda_id, data_pianificata);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.piano_editoriale TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.piano_editoriale TO service_role;
ALTER TABLE public.piano_editoriale ENABLE ROW LEVEL SECURITY;
