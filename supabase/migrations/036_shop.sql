-- Migration 036: E-commerce (prodotti + ordini)

-- ── Prodotti ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prodotti (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id      uuid REFERENCES public.aziende(id) ON DELETE CASCADE NOT NULL,
  nome            text NOT NULL DEFAULT '',
  descrizione     text DEFAULT '',
  prezzo          numeric(10,2) NOT NULL DEFAULT 0,
  prezzo_scontato numeric(10,2),            -- null = nessuno sconto
  immagini        jsonb DEFAULT '[]',        -- array di URL stringhe
  stock           integer,                   -- null = illimitato
  categoria       text DEFAULT '',
  attivo          boolean DEFAULT true,
  slug            text DEFAULT '',
  ordine          integer DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prodotti_azienda ON public.prodotti (azienda_id);
CREATE INDEX IF NOT EXISTS idx_prodotti_attivo  ON public.prodotti (azienda_id, attivo);

-- ── Ordini ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ordini (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id            uuid REFERENCES public.aziende(id) ON DELETE CASCADE NOT NULL,
  numero                serial,              -- progressivo globale (non per azienda, OK per ora)
  email_cliente         text NOT NULL DEFAULT '',
  nome_cliente          text DEFAULT '',
  telefono_cliente      text DEFAULT '',
  indirizzo             jsonb DEFAULT '{}',  -- { via, cap, citta, provincia, paese }
  voci                  jsonb DEFAULT '[]',  -- snapshot [{ prodotto_id, nome, prezzo, prezzo_scontato, qty, immagine }]
  totale                numeric(10,2) DEFAULT 0,
  stato                 text DEFAULT 'in_attesa',
  -- stati: in_attesa | pagato | in_lavorazione | spedito | consegnato | annullato
  note_cliente          text DEFAULT '',
  note_admin            text DEFAULT '',
  stripe_session_id     text,
  stripe_payment_intent text,
  tracking_url          text DEFAULT '',
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ordini_azienda ON public.ordini (azienda_id);
CREATE INDEX IF NOT EXISTS idx_ordini_stato   ON public.ordini (azienda_id, stato);
CREATE INDEX IF NOT EXISTS idx_ordini_email   ON public.ordini (email_cliente);

-- ── Grants ────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prodotti TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prodotti TO service_role;
GRANT SELECT ON public.prodotti TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordini TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordini TO service_role;

GRANT USAGE, SELECT ON SEQUENCE public.ordini_numero_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.ordini_numero_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.ordini_numero_seq TO anon;

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.prodotti ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordini   ENABLE ROW LEVEL SECURITY;
