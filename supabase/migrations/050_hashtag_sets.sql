CREATE TABLE IF NOT EXISTS public.hashtag_sets (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  azienda_id uuid REFERENCES aziende(id) ON DELETE CASCADE NOT NULL,
  nome       text NOT NULL DEFAULT '',
  canale     text DEFAULT '',
  pillar     text DEFAULT '',
  tags       text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hashtag_sets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hashtag_sets TO service_role;
ALTER TABLE public.hashtag_sets ENABLE ROW LEVEL SECURITY;
