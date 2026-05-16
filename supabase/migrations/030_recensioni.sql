-- Sprint 6: Reviews & Reputation
-- Recensioni raccolte via form (token) o importate manualmente

CREATE TABLE IF NOT EXISTS public.recensioni (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id  uuid REFERENCES public.aziende(id) ON DELETE CASCADE NOT NULL,
  entity_tipo text NOT NULL CHECK (entity_tipo IN ('struttura','ristorante','attivita')),
  entity_id   uuid NOT NULL,
  token       uuid UNIQUE DEFAULT gen_random_uuid(),   -- link form pubblico
  autore      text NOT NULL DEFAULT '',
  stelle      int NOT NULL CHECK (stelle BETWEEN 1 AND 5),
  testo       text DEFAULT '',
  fonte       text DEFAULT 'form',   -- 'form' | 'google' | 'tripadvisor' | 'booking' | 'manuale'
  verificata  boolean DEFAULT false, -- true = inviata via token (cliente reale)
  pubblica    boolean DEFAULT true,  -- admin può nascondere
  risposta    text,                  -- risposta pubblica dell'admin
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recensioni_entity
  ON public.recensioni (entity_tipo, entity_id)
  WHERE pubblica = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recensioni TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recensioni TO service_role;
GRANT SELECT ON public.recensioni TO anon;

ALTER TABLE public.recensioni ENABLE ROW LEVEL SECURITY;
