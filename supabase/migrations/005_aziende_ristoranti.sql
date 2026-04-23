-- ============================================================
-- StayApp — Step 1: Aziende + Ristoranti
-- Eseguire nel SQL Editor di Supabase
-- ============================================================

-- ── 1. Tabella aziende (sostituisce groups) ────────────────
CREATE TABLE IF NOT EXISTS aziende (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ragione_sociale   text        NOT NULL,
  partita_iva       text,
  codice_fiscale    text,
  email             text,
  pec               text,
  telefono          text,
  cellulare         text,
  indirizzo         text,
  citta             text,
  cap               text,
  provincia         text,
  -- Moduli attivati per questa azienda
  moduli            jsonb       NOT NULL DEFAULT '{"struttura": false, "ristorante": false}',
  piano             plan_type   NOT NULL DEFAULT 'base',
  active            boolean     NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS aziende_active_idx ON aziende (active);

-- ── 2. Collega profiles ad azienda ────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS azienda_id uuid REFERENCES aziende(id) ON DELETE SET NULL;

-- ── 3. Collega properties (strutture) ad azienda ──────────
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS azienda_id uuid REFERENCES aziende(id) ON DELETE SET NULL;

-- ── 4. Tabella ristoranti ──────────────────────────────────
CREATE TABLE IF NOT EXISTS ristoranti (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id    uuid        NOT NULL REFERENCES aziende(id) ON DELETE CASCADE,
  slug          text        NOT NULL UNIQUE,
  name          text        NOT NULL,
  description   text,
  address       text,
  phone         text,
  email         text,
  schedule      text,           -- es. "Lun-Ven 12:00-14:30 / 19:00-22:30"
  cover_url     text,
  logo_url      text,
  active        boolean     NOT NULL DEFAULT true,
  theme         jsonb       NOT NULL DEFAULT '{"primaryColor":"#e63946","bgColor":"#ffffff","textColor":"#1a1a2e","fontHeading":"playfair","fontBody":"inter","headerStyle":"solid","borderStyle":"mixed"}',
  gallery       jsonb       NOT NULL DEFAULT '[]',
  menu          jsonb       NOT NULL DEFAULT '[]',  -- array categorie con items
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ristoranti_slug_idx      ON ristoranti (slug);
CREATE INDEX IF NOT EXISTS ristoranti_azienda_idx   ON ristoranti (azienda_id);

-- ── 5. RLS ────────────────────────────────────────────────
ALTER TABLE aziende    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ristoranti ENABLE ROW LEVEL SECURITY;

-- aziende: super_admin vede tutto (via service role nel server)
-- admin_azienda vede solo la propria
CREATE POLICY "aziende_select" ON aziende
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'super_admin' OR p.azienda_id = aziende.id)
    )
  );

CREATE POLICY "aziende_update" ON aziende
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'super_admin' OR p.azienda_id = aziende.id)
    )
  );

-- ristoranti: visibili a chi appartiene alla stessa azienda
CREATE POLICY "ristoranti_select" ON ristoranti
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'super_admin' OR p.azienda_id = ristoranti.azienda_id)
    )
  );

CREATE POLICY "ristoranti_update" ON ristoranti
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'super_admin' OR p.azienda_id = ristoranti.azienda_id)
    )
  );

-- ── 6. Aggiorna enum user_role (admin_gruppo → admin_azienda) ──
-- NOTA: in Supabase non si può rinominare un valore enum direttamente.
-- Aggiungiamo il nuovo valore mantenendo il vecchio per retrocompatibilità.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin_azienda';

-- ── Note ──────────────────────────────────────────────────
-- La tabella groups rimane ma è deprecata.
-- I nuovi profili useranno azienda_id invece di group_id.
-- La migrazione dei dati esistenti (groups → aziende) va fatta manualmente
-- dopo aver creato le aziende corrispondenti.
