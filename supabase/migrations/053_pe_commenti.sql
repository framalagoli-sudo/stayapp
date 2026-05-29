-- Commenti collaborativi sui post del piano editoriale
CREATE TABLE IF NOT EXISTS public.pe_commenti (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id     uuid REFERENCES piano_editoriale(id) ON DELETE CASCADE NOT NULL,
  azienda_id  uuid REFERENCES aziende(id) ON DELETE CASCADE NOT NULL,
  author_id   uuid NOT NULL,
  author_name text DEFAULT '',
  testo       text NOT NULL DEFAULT '',
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pe_commenti_post_id_idx ON public.pe_commenti(post_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pe_commenti TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pe_commenti TO service_role;
ALTER TABLE public.pe_commenti ENABLE ROW LEVEL SECURITY;
