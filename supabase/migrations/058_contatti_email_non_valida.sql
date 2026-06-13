-- Protezione reputazione email: marca indirizzi bounced/complained
-- Usato da: Resend bounce webhook, skip autoresponder, skip newsletter

ALTER TABLE public.contatti
  ADD COLUMN IF NOT EXISTS email_non_valida boolean DEFAULT false;

COMMENT ON COLUMN public.contatti.email_non_valida
  IS 'true = indirizzo bounced o marked-as-spam da Resend — nessun invio futuro';
