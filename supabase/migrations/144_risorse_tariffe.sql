-- Il calendario dei prezzi di una risorsa: ogni giorno può avere il suo.
--
-- Fino a qui una risorsa aveva un prezzo solo, moltiplicato per i giorni, e
-- un minimo uguale tutto l'anno. Chi noleggia o affitta ragiona invece come un
-- albergo: agosto non costa come novembre, il sabato non si riconsegna, a
-- Ferragosto si noleggia per una settimana. Il modello è quello dei gestionali
-- alberghieri: **la verità è il giorno**, e le «stagioni» sono solo un modo
-- veloce di scrivere tanti giorni insieme.
--
-- ⚠️ La tabella è **sparsa**: contiene solo i giorni che differiscono dal
-- prezzo base della risorsa. Una risorsa senza righe si comporta esattamente
-- come prima — nessun dato esistente cambia senso con questa migration.
--
-- `ora_inizio`/`ora_fine` vuoti = tutto il giorno (risorse a giornate). Le
-- fasce orarie servono agli slot (una parrucchiera, un campo): lo schema le
-- regge già, il pannello arriverà quando un cliente le chiederà.

CREATE TABLE IF NOT EXISTS public.risorse_tariffe (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risorsa_id        uuid NOT NULL REFERENCES public.risorse(id) ON DELETE CASCADE,
  data              date NOT NULL,
  ora_inizio        time,
  ora_fine          time,

  -- null = il prezzo base della risorsa
  prezzo            numeric,

  -- Le restrizioni, come nei gestionali alberghieri. I limiti sono in notti,
  -- come `disponibilita.minimo_notti`: il pannello li mostra in giorni a chi
  -- conta il giorno di riconsegna.
  minimo_notti      integer,   -- minimo per chi INIZIA in questo giorno
  massimo_notti     integer,   -- massimo per chi inizia in questo giorno
  chiuso_arrivo     boolean NOT NULL DEFAULT false,  -- in questo giorno non si inizia
  chiuso_partenza   boolean NOT NULL DEFAULT false,  -- in questo giorno non si riconsegna / non si esce
  non_vendibile     boolean NOT NULL DEFAULT false,  -- questo giorno non si vende

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT risorse_tariffe_prezzo_valido   CHECK (prezzo IS NULL OR prezzo >= 0),
  CONSTRAINT risorse_tariffe_minimo_valido   CHECK (minimo_notti IS NULL OR minimo_notti >= 0),
  CONSTRAINT risorse_tariffe_massimo_valido  CHECK (massimo_notti IS NULL OR massimo_notti >= 0),
  CONSTRAINT risorse_tariffe_fascia_valida   CHECK (
    (ora_inizio IS NULL AND ora_fine IS NULL) OR
    (ora_inizio IS NOT NULL AND ora_fine IS NOT NULL AND ora_fine > ora_inizio))
);

-- Un giorno intero ha una riga sola; una fascia ha una riga sola per orario.
-- (Due indici parziali: in un UNIQUE normale i NULL non si scontrano mai.)
CREATE UNIQUE INDEX IF NOT EXISTS risorse_tariffe_giorno_unico
  ON public.risorse_tariffe (risorsa_id, data) WHERE ora_inizio IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS risorse_tariffe_fascia_unica
  ON public.risorse_tariffe (risorsa_id, data, ora_inizio) WHERE ora_inizio IS NOT NULL;

-- La domanda di ogni calcolo: «i giorni di questa risorsa fra X e Y».
CREATE INDEX IF NOT EXISTS idx_risorse_tariffe_periodo
  ON public.risorse_tariffe (risorsa_id, data);

-- La leggono e scrivono solo le route (chiave di servizio), che controllano
-- l'azienda. Nessuna policy: per il browser la tabella resta chiusa.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risorse_tariffe TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risorse_tariffe TO service_role;
ALTER TABLE public.risorse_tariffe ENABLE ROW LEVEL SECURITY;

-- Con un prezzo che cambia ogni giorno, «prezzo unitario × giorni» non spiega
-- più un totale. Si fotografa il conto com'era al momento della prenotazione:
-- i giorni col loro prezzo e la promozione applicata. Cambiare il listino dopo
-- non tocca chi ha già prenotato, e il titolare può rispondere «perché ho
-- pagato così?».
ALTER TABLE public.prenotazioni
  ADD COLUMN IF NOT EXISTS dettaglio_prezzo jsonb;

GRANT SELECT (dettaglio_prezzo) ON public.prenotazioni TO authenticated;

COMMENT ON TABLE public.risorse_tariffe IS
  'Calendario dei prezzi e delle restrizioni di una risorsa. Sparso: solo i giorni diversi dal prezzo base.';
COMMENT ON COLUMN public.prenotazioni.dettaglio_prezzo IS
  'Fotografia del conto alla prenotazione: giorni col loro prezzo, promozione applicata.';
