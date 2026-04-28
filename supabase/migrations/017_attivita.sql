CREATE TABLE IF NOT EXISTS attivita (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id  uuid REFERENCES aziende(id) ON DELETE CASCADE,
  slug        text UNIQUE NOT NULL,
  name        text NOT NULL,
  tipo        text DEFAULT 'attività',  -- spa, negozio, palestra, studio, agenzia, altro
  description text,
  address     text,
  phone       text,
  email       text,
  schedule    text,
  cover_url   text,
  logo_url    text,
  active      boolean DEFAULT true,
  theme       jsonb DEFAULT '{"primaryColor":"#6b46c1","bgColor":"#ffffff","textColor":"#1a1a2e","fontHeading":"playfair","fontBody":"inter","headerStyle":"solid","borderStyle":"mixed"}'::jsonb,
  gallery     jsonb DEFAULT '[]'::jsonb,
  services    jsonb DEFAULT '[]'::jsonb,
  minisito    jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS attivita_azienda_id_idx ON attivita(azienda_id);

-- Aggiunge modulo attivita alla tabella aziende (se non esiste già)
ALTER TABLE aziende ADD COLUMN IF NOT EXISTS moduli jsonb DEFAULT '{"struttura":false,"ristorante":false,"attivita":false}'::jsonb;
