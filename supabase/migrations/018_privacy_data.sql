-- Aggiunge privacy_data JSONB a strutture, ristoranti e attività
-- Contiene: dati titolare trattamento, DPO, servizi attivi, cookie extra

ALTER TABLE properties ADD COLUMN IF NOT EXISTS privacy_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE ristoranti  ADD COLUMN IF NOT EXISTS privacy_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE attivita    ADD COLUMN IF NOT EXISTS privacy_data JSONB DEFAULT '{}'::jsonb;
