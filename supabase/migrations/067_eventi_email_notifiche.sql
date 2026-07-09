-- Notifiche email per le prenotazioni evento, configurabili PER EVENTO.
--  notify_owner_on_booking : invia al titolare una mail ad ogni nuova prenotazione
--  send_guest_confirmation : invia all'ospite una mail di conferma (white-label)
-- Default: notifica titolare ON (per non perdere prenotazioni), conferma ospite OFF (opt-in).
-- Colonne su tabella esistente → i grant di tabella già in essere restano validi.

ALTER TABLE public.eventi
  ADD COLUMN IF NOT EXISTS notify_owner_on_booking boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS send_guest_confirmation  boolean NOT NULL DEFAULT false;
