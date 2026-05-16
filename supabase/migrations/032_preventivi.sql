-- Sprint: Preventivi digitali

CREATE TABLE IF NOT EXISTS public.preventivi (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id  uuid REFERENCES public.aziende(id) ON DELETE CASCADE NOT NULL,
  contatto_id uuid REFERENCES public.contatti(id) ON DELETE SET NULL,
  numero      text NOT NULL DEFAULT '',   -- es. PRE-2026-001
  titolo      text NOT NULL DEFAULT '',
  stato       text DEFAULT 'bozza'        -- bozza | inviato | accettato | rifiutato | scaduto
    CHECK (stato IN ('bozza','inviato','accettato','rifiutato','scaduto')),
  valuta      text DEFAULT 'EUR',
  iva_pct     int  DEFAULT 0,             -- 0 | 4 | 10 | 22
  voci        jsonb DEFAULT '[]',
  -- voce: { id, descrizione, qty, prezzo_unitario, sconto_pct }
  note        text DEFAULT '',
  scadenza    date,
  token       uuid UNIQUE DEFAULT gen_random_uuid(),
  accettato_at timestamptz,
  firma_nome  text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_preventivi_azienda ON public.preventivi (azienda_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_preventivi_token   ON public.preventivi (token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.preventivi TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preventivi TO service_role;
GRANT SELECT ON public.preventivi TO anon;

ALTER TABLE public.preventivi ENABLE ROW LEVEL SECURITY;
