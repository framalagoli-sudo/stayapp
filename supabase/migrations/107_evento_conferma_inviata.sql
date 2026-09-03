-- Quando è stata mandata la conferma a chi ha prenotato.
--
-- Serve a mandarla **una volta sola**. Stripe rispedisce lo stesso evento in
-- caso di dubbio, e il processo che libera i posti può ripassare sulla stessa
-- prenotazione: due conferme identiche a mezz'ora di distanza fanno pensare a
-- un doppio addebito, che è la telefonata peggiore che un cliente possa
-- ricevere.
--
-- È una data e non un booleano perché la domanda vera non è «gliel'abbiamo
-- mandata?» ma «quando?»: serve a ricostruire cosa è successo quando qualcuno
-- dice di non aver ricevuto niente.

ALTER TABLE public.event_bookings
  ADD COLUMN IF NOT EXISTS conferma_inviata_il timestamptz;

COMMENT ON COLUMN public.event_bookings.conferma_inviata_il IS
  'Quando è partita la conferma all''ospite. NULL = mai. Impedisce il doppio invio.';
