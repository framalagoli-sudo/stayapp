-- Tabella contatti / CRM base
CREATE TABLE IF NOT EXISTS contatti (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id   uuid REFERENCES aziende(id) ON DELETE CASCADE,
  nome         text NOT NULL,
  email        text,
  telefono     text,
  tags         jsonb    DEFAULT '[]'::jsonb,
  fonte        text     DEFAULT 'manuale',  -- manuale | minisito | pwa | import
  iscritto_newsletter boolean DEFAULT false,
  note         text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contatti_azienda_id_idx ON contatti(azienda_id);
CREATE INDEX IF NOT EXISTS contatti_email_idx ON contatti(email);
