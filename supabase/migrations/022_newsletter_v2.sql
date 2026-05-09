-- Token per double opt-in
ALTER TABLE contatti ADD COLUMN IF NOT EXISTS confirmation_token uuid;

-- Newsletter: schedulazione, preheader, contatore disiscrizioni
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS preheader text DEFAULT '';
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS unsubscribes_count int DEFAULT 0;
