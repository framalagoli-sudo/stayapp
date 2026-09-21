-- I posti che il sito NON può vendere, perché sono tenuti per il telefono.
--
-- ⛔ Il caso vero (Garage 22, 21/09/2026): evento da 60 posti, sold out nella
-- realtà, e nel sistema risultavano 29 posti presi — 12 prenotazioni dal sito
-- e **una sola** segnata a mano. Una trentina di posti venduti al telefono non
-- sono mai entrati da nessuna parte, e il sito ha continuato a dire «liberi».
-- La toppa è stata chiudere le prenotazioni a mano.
--
-- La radice non è tecnica: chi è in servizio non apre il gestionale mentre
-- squilla il telefono, e nessuna funzione lo convincerà. Quindi invece di
-- pretendere che quel canale scriva, gli si riserva una quota: il sito vende
-- solo ciò che resta, e non può sbagliare **anche se nessuno segna niente**.
--
--   posti vendibili online = seats_total - posti_riservati - prenotazioni
--
-- `seats_total` resta la capienza VERA del posto: il titolare continua a
-- vedere il numero giusto, e le prenotazioni prese a mano possono usare anche
-- i riservati, perché sono suoi.
--
-- Predefinito 0: nessun evento cambia comportamento.

ALTER TABLE public.eventi
  ADD COLUMN IF NOT EXISTS posti_riservati integer NOT NULL DEFAULT 0;

ALTER TABLE public.eventi DROP CONSTRAINT IF EXISTS eventi_posti_riservati_chk;
ALTER TABLE public.eventi ADD CONSTRAINT eventi_posti_riservati_chk
  CHECK (posti_riservati >= 0);

-- La colonna esce dalle route pubbliche: senza il permesso, il sito
-- continuerebbe a vendere i posti riservati.
GRANT SELECT (posti_riservati) ON public.eventi TO anon;
GRANT SELECT (posti_riservati) ON public.eventi TO authenticated;
GRANT UPDATE (posti_riservati) ON public.eventi TO authenticated;
GRANT SELECT (posti_riservati), UPDATE (posti_riservati), INSERT (posti_riservati)
  ON public.eventi TO service_role;
