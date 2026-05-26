-- Migration 044: require_2fa flag per azienda
-- L'admin_azienda può obbligare tutti i collaboratori ad attivare il 2FA

ALTER TABLE aziende ADD COLUMN IF NOT EXISTS require_2fa boolean DEFAULT false;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aziende TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aziende TO service_role;
