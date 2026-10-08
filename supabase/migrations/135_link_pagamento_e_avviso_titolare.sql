-- 135 — Il link di pagamento per le prenotazioni scritte a mano, e l'avviso al
--       titolare quando arriva una prenotazione di una risorsa.
--
-- 1. `pagamento_richiesto_il` (eventi e risorse): quando il titolare ha chiesto
--    il pagamento con un link. Serve a distinguere due cose che nel database
--    sembrano uguali («non_pagato» con una sessione di Stripe):
--      · chi si è prenotato da solo ed è alla cassa → ha mezz'ora, poi il posto
--        torna libero;
--      · chi ha ricevuto un link dal titolare       → ha un giorno, e se non
--        paga la prenotazione RESTA: l'ha scritta il titolare, non deve sparire.
--    NULL = nessun link (il caso di sempre).
--
-- 2. `event_bookings.importo_online`: la cifra portata alla cassa, come già per
--    le risorse (migration 134). Con un link la decide il titolare, quindi non
--    si può più ricavare dalla percentuale di acconto dell'evento.
--
-- 3. `risorse.avvisa_titolare`: l'email «nuova prenotazione» al titolare. Sugli
--    eventi c'è da sempre (`notify_owner_on_booking`); per le risorse non
--    partiva niente, e una richiesta da approvare si scopriva solo aprendo il
--    pannello. Accesa per tutte: chi non la vuole la spegne nella scheda.
--
-- Nessuna colonna pubblica: le tre tabelle si leggono dal pubblico solo
-- attraverso route che elencano le colonne, e queste non ci sono.

BEGIN;

ALTER TABLE public.event_bookings ADD COLUMN IF NOT EXISTS pagamento_richiesto_il timestamptz;
ALTER TABLE public.event_bookings ADD COLUMN IF NOT EXISTS importo_online numeric(10,2);
ALTER TABLE public.event_bookings DROP CONSTRAINT IF EXISTS event_bookings_importo_online_check;
ALTER TABLE public.event_bookings ADD CONSTRAINT event_bookings_importo_online_check
  CHECK (importo_online IS NULL OR importo_online >= 0);

ALTER TABLE public.prenotazioni ADD COLUMN IF NOT EXISTS pagamento_richiesto_il timestamptz;

ALTER TABLE public.risorse ADD COLUMN IF NOT EXISTS avvisa_titolare boolean NOT NULL DEFAULT true;

COMMIT;
