-- La conferma di prenotazione parte davvero.
--
-- ⛔ Misurato in produzione: TUTTI e quattro gli eventi pubblicati avevano
-- `send_guest_confirmation` a false, campagna in corso compresa. Chi prenotava
-- leggeva «prenotazione registrata» e restava senza niente in mano: né data, né
-- luogo, né posti. E chi veniva promosso dalla lista d'attesa non lo sapeva —
-- restava ad aspettare una chiamata già arrivata.
--
-- Il default `false` della migration 067 era giusto ALLORA: la prenotazione
-- nasceva «in attesa», e scrivere «confermata» sarebbe stata una bugia. La 106
-- ha cambiato il default a confermata; questo flag è rimasto indietro. Non era
-- una scelta di nessuno: era un residuo.
--
-- ⚠️ Non è retroattivo: parte solo per le prenotazioni nuove. Alle 13 già
-- registrate non arriva nulla — `conferma_inviata_il` resta come sta, e
-- `mandaConfermaEvento` non manda mai due volte.
--
-- ⚠️ Il default qui NON basta da solo: l'editor manda sempre il valore
-- esplicito, quindi un evento creato dal pannello nascerebbe spento comunque.
-- La riga corrispondente sta in `EventoEditPage.jsx`. Le due si muovono insieme.

ALTER TABLE public.eventi
  ALTER COLUMN send_guest_confirmation SET DEFAULT true;

-- Gli eventi che ci sono già: erano spenti per default, non per decisione.
-- Autorizzato da Francesco l'08/09/2026 dopo aver visto cosa cambia per chi
-- prenota. Chi vorrà spegnerla ha l'interruttore nella scheda dell'evento.
UPDATE public.eventi
   SET send_guest_confirmation = true
 WHERE send_guest_confirmation = false;
