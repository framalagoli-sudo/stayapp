-- Migration 039: Google Calendar integration
-- Eseguire manualmente su Supabase Dashboard → SQL Editor

ALTER TABLE public.aziende
  ADD COLUMN IF NOT EXISTS google_calendar_token jsonb;
-- { access_token, refresh_token, expiry_date, email }

ALTER TABLE public.prenotazioni
  ADD COLUMN IF NOT EXISTS google_event_id text;
-- ID evento Google Calendar, usato per aggiornare/cancellare

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aziende TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aziende TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prenotazioni TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prenotazioni TO service_role;
