-- 141 — L'ospite annulla da solo, e la lista d'attesa si muove da sola.
--
-- Decisioni di Francesco del 26/10/2026:
--   · annullare si può fino a un termine, come la cancellazione gratuita di
--     Booking: lo sceglie il titolare evento per evento (se applicarlo, e
--     quante ore prima). Predefinito: sì, fino a 24 ore prima. Oltre il
--     termine non si annulla dal link: si contatta il locale.
--   · il rimborso a chi ha pagato lo fa il titolare a mano da Stripe: noi non
--     tocchiamo i soldi dei clienti. Lo diciamo, non lo facciamo.
--   · quando si libera un posto lo si offre al primo in lista: 1 ora per
--     prenderlo, mezz'ora se l'evento è il giorno stesso. Interruttore per
--     evento, SPENTO sugli eventi che esistono (nessuno si trova un
--     comportamento nuovo senza saperlo); il pannello lo accende sui nuovi.
--
-- 1. `eventi.annullabile` / `annullabile_ore` / `lista_automatica`.
-- 2. `event_bookings.annulla_token`: il link «Non posso più venire». Le righe
--    che esistono lo ricevono dal DEFAULT, ma nessuna email già partita lo
--    contiene: vale per le prenotazioni da qui in avanti.
-- 3. L'offerta del posto a chi è in lista: `offerta_token` (il link),
--    `offerta_scade_il` (fino a quando il posto è tenuto per lui),
--    `offerta_scaduta_il` (non ha risposto: resta in lista, ma non gli si
--    offre più niente da solo — lo può ancora chiamare il titolare).
--    ⚠️ Chi ha un'offerta valida OCCUPA il posto: la regola è `occupaPosto`
--    in `lib/gruppi-prenotazioni-evento.js`, usata da chi conta i posti.
-- 4. `cassa_aperta_il`: da quando corre la mezz'ora per pagare. Il giro che
--    libera i posti non pagati guardava `created_at`, che per chi arriva dalla
--    lista d'attesa è vecchio di giorni: gli avrebbe chiuso la cassa subito.
-- 5. `annullata_dall_ospite_il`: chi ha annullato, e quando. Il pannello lo
--    dice, e a una pagata aggiunge «da rimborsare».

BEGIN;

ALTER TABLE public.eventi ADD COLUMN IF NOT EXISTS annullabile boolean NOT NULL DEFAULT true;
ALTER TABLE public.eventi ADD COLUMN IF NOT EXISTS annullabile_ore integer NOT NULL DEFAULT 24;
ALTER TABLE public.eventi DROP CONSTRAINT IF EXISTS eventi_annullabile_ore_check;
ALTER TABLE public.eventi ADD CONSTRAINT eventi_annullabile_ore_check
  CHECK (annullabile_ore BETWEEN 0 AND 720);
ALTER TABLE public.eventi ADD COLUMN IF NOT EXISTS lista_automatica boolean NOT NULL DEFAULT false;

ALTER TABLE public.event_bookings ADD COLUMN IF NOT EXISTS annulla_token uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS event_bookings_annulla_token_key ON public.event_bookings (annulla_token);
ALTER TABLE public.event_bookings ADD COLUMN IF NOT EXISTS offerta_token uuid;
CREATE UNIQUE INDEX IF NOT EXISTS event_bookings_offerta_token_key ON public.event_bookings (offerta_token);
ALTER TABLE public.event_bookings ADD COLUMN IF NOT EXISTS offerta_scade_il timestamptz;
ALTER TABLE public.event_bookings ADD COLUMN IF NOT EXISTS offerta_scaduta_il timestamptz;
ALTER TABLE public.event_bookings ADD COLUMN IF NOT EXISTS cassa_aperta_il timestamptz;
ALTER TABLE public.event_bookings ADD COLUMN IF NOT EXISTS annullata_dall_ospite_il timestamptz;

-- 🔒 Il termine si legge sulla pagina pubblica dell'evento («annullamento
-- gratuito fino a…»): queste due sì, al ruolo pubblico. `lista_automatica` no:
-- è un'impostazione del titolare, il visitatore non ha motivo di vederla.
GRANT SELECT (annullabile, annullabile_ore) ON public.eventi TO anon;
GRANT SELECT (annullabile, annullabile_ore, lista_automatica) ON public.eventi TO authenticated;
GRANT UPDATE (annullabile, annullabile_ore, lista_automatica) ON public.eventi TO authenticated;
GRANT SELECT (annullabile, annullabile_ore, lista_automatica), UPDATE (annullabile, annullabile_ore, lista_automatica),
  INSERT (annullabile, annullabile_ore, lista_automatica) ON public.eventi TO service_role;

-- Le colonne nuove delle prenotazioni: solo la chiave di servizio. I token
-- sono segreti — chi li ha annulla una prenotazione o prende un posto — e il
-- pannello li legge dalle route, non dal database.
GRANT SELECT (annulla_token, offerta_token, offerta_scade_il, offerta_scaduta_il, cassa_aperta_il, annullata_dall_ospite_il),
  UPDATE (annulla_token, offerta_token, offerta_scade_il, offerta_scaduta_il, cassa_aperta_il, annullata_dall_ospite_il),
  INSERT (annulla_token, offerta_token, offerta_scade_il, offerta_scaduta_il, cassa_aperta_il, annullata_dall_ospite_il)
  ON public.event_bookings TO service_role;

COMMIT;
