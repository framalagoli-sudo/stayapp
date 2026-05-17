-- Migration 040: Loyalty / Fidelizzazione
-- Eseguire manualmente su Supabase Dashboard → SQL Editor

-- Programma punti (uno per azienda)
CREATE TABLE IF NOT EXISTS public.loyalty_programs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id     uuid NOT NULL REFERENCES public.aziende(id) ON DELETE CASCADE,
  attivo         boolean DEFAULT true,
  nome           text DEFAULT 'Programma fedeltà',
  punti_per_euro numeric(10,2) DEFAULT 10,   -- punti guadagnati per ogni € speso
  valore_punto   numeric(10,4) DEFAULT 0.01, -- valore in € di 1 punto
  soglia_riscatto int DEFAULT 100,           -- punti minimi per riscattare
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  UNIQUE(azienda_id)
);

-- Log movimenti punti per contatto
CREATE TABLE IF NOT EXISTS public.loyalty_points (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id     uuid NOT NULL REFERENCES public.aziende(id) ON DELETE CASCADE,
  contatto_id    uuid NOT NULL REFERENCES public.contatti(id) ON DELETE CASCADE,
  punti          int NOT NULL,  -- positivo = guadagnati, negativo = riscattati/scaduti
  tipo           text NOT NULL CHECK (tipo IN ('acquisto','prenotazione','manuale','riscatto','scadenza')),
  riferimento_id uuid,          -- ordine_id o prenotazione_id di riferimento
  note           text,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_points_contatto ON public.loyalty_points (azienda_id, contatto_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_created  ON public.loyalty_points (created_at DESC);

-- Gift card
CREATE TABLE IF NOT EXISTS public.gift_cards (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id          uuid NOT NULL REFERENCES public.aziende(id) ON DELETE CASCADE,
  codice              text NOT NULL,
  valore_iniziale     numeric(10,2) NOT NULL,
  valore_residuo      numeric(10,2) NOT NULL,
  attiva              boolean DEFAULT true,
  intestatario_nome   text,
  intestatario_email  text,
  scadenza            date,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  UNIQUE(azienda_id, codice)
);

CREATE INDEX IF NOT EXISTS idx_gift_cards_azienda ON public.gift_cards (azienda_id);

-- Colonne extra su ordini per loyalty
ALTER TABLE public.ordini ADD COLUMN IF NOT EXISTS punti_riscattati int DEFAULT 0;
ALTER TABLE public.ordini ADD COLUMN IF NOT EXISTS sconto_loyalty   numeric(10,2) DEFAULT 0;
ALTER TABLE public.ordini ADD COLUMN IF NOT EXISTS codice_gift_card text;
ALTER TABLE public.ordini ADD COLUMN IF NOT EXISTS sconto_gift_card numeric(10,2) DEFAULT 0;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_programs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_programs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_points   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_points   TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gift_cards       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gift_cards       TO service_role;
GRANT SELECT ON public.gift_cards TO anon;

ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_cards       ENABLE ROW LEVEL SECURITY;
