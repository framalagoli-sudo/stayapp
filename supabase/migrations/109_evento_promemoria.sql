-- Quando è stato mandato il promemoria a chi ha prenotato un evento.
--
-- Serve a mandarlo **una volta sola**. Il titolare preme un pulsante e parte a
-- ventisette persone: se lo preme due volte perché non è sicuro di averlo già
-- fatto — e non lo è mai — quelle ventisette ricevono due email uguali.
--
-- È una data e non un booleano perché la domanda che ci si fa dopo non è
-- «l'abbiamo mandato?» ma «quando?»: serve quando qualcuno dice di non aver
-- ricevuto niente.

ALTER TABLE public.event_bookings
  ADD COLUMN IF NOT EXISTS promemoria_inviato_il timestamptz;

COMMENT ON COLUMN public.event_bookings.promemoria_inviato_il IS
  'Quando è partito il promemoria dell''evento a questa persona. NULL = mai.';
