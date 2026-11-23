-- Le opzioni di un evento: più proposte con posti, prezzo e acconto propri.
--
-- Garage 22 (23/11/2026): la stessa serata si vende come «Cena & spettacolo» a
-- 30 € (i tavoli) e «Ingresso + drink» a 15 € (il bancone). Sono due spazi
-- diversi: ognuno ha i suoi posti, e il totale dell'evento è la loro somma, non
-- un numero scritto a mano. In una prenotazione si possono prendere quantità di
-- più opzioni insieme (1 cena + 2 ingressi), e la lista d'attesa è per opzione.
--
-- Le opzioni stanno in `eventi.packages` (jsonb, esisteva già, mai usato da
-- nessun evento al 23/11): nome, prezzo, descrizione, posti, posti tenuti per il
-- telefono, percentuale da pagare prenotando. Non servono colonne per questo.
--
-- Servono due colonne:
--
--   event_bookings.scelte      la fotografia di cosa si è prenotato:
--                              [{ id, nome, prezzo, quantita, acconto }]
--                              Il listino può cambiare dopo: la prenotazione
--                              resta com'era (come `prenotazioni.dettaglio_prezzo`).
--                              `seats` resta la somma delle quantità, così ogni
--                              conto dei posti già scritto continua a valere.
--
--   eventi.opzioni_prenotate   quanti posti sono occupati per opzione:
--                              { "<id opzione>": 12, … }
--                              Una copia ricalcolata da `recomputeEventSeats`,
--                              come `seats_booked`: le pagine pubbliche la
--                              leggono senza contare le prenotazioni.
--
-- Nessuna delle due esce al pubblico: le route leggono con la chiave di
-- servizio e pubblicano solo i posti ancora prenotabili (`postiPubblici`).

ALTER TABLE public.event_bookings
  ADD COLUMN IF NOT EXISTS scelte jsonb;

ALTER TABLE public.event_bookings
  DROP CONSTRAINT IF EXISTS event_bookings_scelte_elenco;
ALTER TABLE public.event_bookings
  ADD CONSTRAINT event_bookings_scelte_elenco
  CHECK (scelte IS NULL OR jsonb_typeof(scelte) = 'array');

ALTER TABLE public.eventi
  ADD COLUMN IF NOT EXISTS opzioni_prenotate jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.eventi
  DROP CONSTRAINT IF EXISTS eventi_opzioni_prenotate_oggetto;
ALTER TABLE public.eventi
  ADD CONSTRAINT eventi_opzioni_prenotate_oggetto
  CHECK (jsonb_typeof(opzioni_prenotate) = 'object');

-- Le tabelle hanno già GRANT e RLS (migration 015 e successive). Le colonne
-- nuove NON si concedono al ruolo pubblico, di proposito.
ALTER TABLE public.event_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventi ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_bookings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eventi TO service_role;

COMMENT ON COLUMN public.event_bookings.scelte IS
  'Cosa si è prenotato, opzione per opzione: [{id, nome, prezzo, quantita, acconto}]. seats = somma delle quantità.';
COMMENT ON COLUMN public.eventi.opzioni_prenotate IS
  'Posti occupati per opzione, ricalcolati da recomputeEventSeats. Copia, non verità: la verità sono le prenotazioni.';
