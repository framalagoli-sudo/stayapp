-- Una prenotazione a un evento nasce CONFERMATA.
--
-- Com'era: nasceva «in attesa», e qualcuno avrebbe dovuto confermarla a mano.
-- Nessuno l'ha mai fatto — 13 prenotazioni su 13, da aprile a settembre. E
-- intanto all'ospite arrivava già un'email intitolata «Prenotazione
-- confermata»: le due parti leggevano due verità diverse, con la stessa parola.
--
-- Il risultato pratico era che il titolare apriva la pagina del suo evento e
-- leggeva «0 confermati · €0 di ricavo» mentre aveva nove persone e 375 € di
-- cena prenotata. Il numero era esatto e raccontava il falso.
--
-- ⚠️ «In attesa» NON sparisce: tornerà a voler dire qualcosa il giorno che i
-- pagamenti saranno accesi — *in attesa di pagamento*, che è un'attesa vera.
-- E «cancellata» serve da subito.

ALTER TABLE public.event_bookings ALTER COLUMN status SET DEFAULT 'confirmed';

-- Lo stato non aveva alcun vincolo: `text DEFAULT 'pending'` e basta, con la
-- route che accettava qualunque stringa arrivasse dal client. Uno stato
-- inventato creava una prenotazione fantasma — nessun riquadro la contava,
-- mentre continuava a occupare i posti.
--
-- ⚠️ Il muro che conta è già nella route (`eventi/bookings/[bookingId]`, catalogo
-- chiuso, 400 se non torna): questo è il **secondo**, per la route che qualcuno
-- scriverà domani senza ricordarsi del primo. Per questo la migration non è
-- urgente — si può eseguire con comodo, anche a campagna finita.
DO $$ BEGIN
  ALTER TABLE public.event_bookings
    ADD CONSTRAINT event_bookings_status_chk
    CHECK (status IN ('pending', 'confirmed', 'cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ⛔ LE PRENOTAZIONI GIÀ PRESE NON SI TOCCANO.
--
-- C'era qui un `UPDATE ... SET status = 'confirmed' WHERE status = 'pending'`,
-- e l'ha fermato Francesco: c'è una campagna in corso su quell'evento, e uno
-- storico riscritto in mezzo a un lancio è un rischio preso per un beneficio
-- estetico — il riquadro del titolare che mostra un numero più bello.
--
-- Le tredici restano «in attesa» com'erano. Solo le nuove nascono confermate.
-- Si possono sempre confermare a mano dal pannello, una per una, guardandole.
