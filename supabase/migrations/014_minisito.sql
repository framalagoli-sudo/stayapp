-- Aggiunge colonna minisito a properties e ristoranti
-- Contiene: active, tagline, booking_url, seo_title, seo_description

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS minisito jsonb DEFAULT '{"active":false}'::jsonb;

ALTER TABLE ristoranti
  ADD COLUMN IF NOT EXISTS minisito jsonb DEFAULT '{"active":false}'::jsonb;
