-- Aggiunge la colonna modules alla tabella properties
-- Eseguire nel SQL Editor di Supabase

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS modules JSONB NOT NULL DEFAULT
  '{"reception": true, "housekeeping": false, "restaurant": false, "upselling": false, "chat": false, "wifi": true, "info": true}';

-- Aggiorna le righe esistenti che hanno ancora il default NULL (sicurezza)
UPDATE properties
SET modules = '{"reception": true, "housekeeping": false, "restaurant": false, "upselling": false, "chat": false, "wifi": true, "info": true}'
WHERE modules IS NULL;
