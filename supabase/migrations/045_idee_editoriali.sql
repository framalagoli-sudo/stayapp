CREATE TABLE IF NOT EXISTS idee_editoriali (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id uuid NOT NULL REFERENCES aziende(id) ON DELETE CASCADE,
  titolo text NOT NULL DEFAULT '',
  note text DEFAULT '',
  pillar text DEFAULT '',
  canali text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.idee_editoriali TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.idee_editoriali TO service_role;
ALTER TABLE public.idee_editoriali ENABLE ROW LEVEL SECURITY;
