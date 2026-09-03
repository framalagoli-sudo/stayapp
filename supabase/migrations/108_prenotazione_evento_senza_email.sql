-- Una prenotazione presa al telefono può non avere un'email.
--
-- La colonna era obbligatoria perché fino a ieri si prenotava **solo** dal
-- sito, dove l'email si chiede e serve a mandare la conferma. Ora il titolare
-- può segnare chi ha telefonato: quella persona detta un nome e riattacca, e
-- pretendere un'email trasformerebbe dieci secondi in una trattativa — con la
-- prenotazione che torna sul quaderno, cioè nel posto da cui la stiamo
-- togliendo.
--
-- ⚠️ Il modulo pubblico continua a chiederla e a rifiutare senza: lì serve
-- davvero, perché è l'unico modo di confermare a chi non ha nessuno davanti.
-- Il vincolo si sposta dove sa distinguere i due casi — nel codice — invece di
-- stare nel database, che li vede uguali.

ALTER TABLE public.event_bookings ALTER COLUMN guest_email DROP NOT NULL;

COMMENT ON COLUMN public.event_bookings.guest_email IS
  'Email di chi ha prenotato. Obbligatoria per le prenotazioni dal sito, facoltativa per quelle segnate a mano dal titolare (telefono).';
