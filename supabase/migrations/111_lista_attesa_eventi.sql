-- La lista d'attesa: chi voleva venire e non è entrato.
--
-- Nasce da una promessa che avevamo già scritto senza mantenerla — il testo
-- «scrivici, teniamo una lista d'attesa» suggerito come messaggio di chiusura,
-- mentre di lista d'attesa non ne esisteva nessuna.
--
-- ⛔ Il valore vero non è la serata in corso: è che alla prossima si parte con
-- l'elenco di chi voleva venire e non è entrato. Per questo le righe restano
-- anche a evento passato.

-- Uno stato in più. Il vincolo va rifatto: aggiungere un valore a un CHECK
-- significa sostituirlo, non modificarlo.
ALTER TABLE public.event_bookings DROP CONSTRAINT IF EXISTS event_bookings_status_chk;
ALTER TABLE public.event_bookings
  ADD CONSTRAINT event_bookings_status_chk
  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'waitlist'));

-- L'interruttore, acceso di default: quando i posti finiscono o il titolare
-- chiude, al posto del modulo compare la lista d'attesa. Chi non la vuole la
-- spegne.
ALTER TABLE public.eventi
  ADD COLUMN IF NOT EXISTS lista_attesa boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.eventi.lista_attesa IS
  'Se acceso, quando non si può più prenotare si raccolgono i nominativi in lista d''attesa invece di chiudere e basta.';

-- 🔒 Serve alla pagina pubblica: una colonna per volta, perché la RLS filtra le
-- righe e non le colonne.
GRANT SELECT (lista_attesa) ON public.eventi TO anon;

-- ⚠️ CHI È IN LISTA NON OCCUPA UN POSTO.
--
-- È il punto di tutta la funzione: se un posto si libera dev'essere libero
-- davvero, altrimenti la lista d'attesa riempirebbe l'evento da sola e nessuno
-- potrebbe più entrare — né prenotando né dalla lista.
--
-- Il conteggio vive in `lib/event-seats.js`, che escludeva solo `cancelled`.
-- Qui si riallineano i contatori già scritti, se qualcuno fosse già entrato in
-- lista prima di questo aggiornamento.
UPDATE public.eventi e SET seats_booked = COALESCE((
  SELECT SUM(COALESCE(b.seats, 1)) FROM public.event_bookings b
  WHERE b.event_id = e.id AND b.status NOT IN ('cancelled', 'waitlist')
), 0);
