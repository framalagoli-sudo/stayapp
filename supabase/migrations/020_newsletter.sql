-- Token univoco per disiscrizione sicura (si auto-genera per tutti i contatti esistenti)
ALTER TABLE contatti ADD COLUMN IF NOT EXISTS unsubscribe_token uuid DEFAULT gen_random_uuid();

-- Tabella newsletter
CREATE TABLE IF NOT EXISTS newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id uuid NOT NULL REFERENCES aziende(id) ON DELETE CASCADE,
  entity_tipo text NOT NULL DEFAULT 'struttura',
  entity_id uuid,
  subject text NOT NULL DEFAULT '',
  template_id text NOT NULL DEFAULT 'semplice',
  content jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  recipients_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
