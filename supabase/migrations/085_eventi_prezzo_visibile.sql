-- Non tutti gli eventi hanno un prezzo, e non tutti quelli che ce l'hanno lo
-- vogliono in vetrina.
--
-- Una cena alla carta non ha una cifra da scrivere: dire «Gratis» è falso,
-- dire «€0» è peggio. Serviva poter scrivere «Alla carta», «Su richiesta»,
-- «Ingresso libero» — e poter togliere del tutto il prezzo dalla copertina.
--
--   mostra_prezzo  se il prezzo compare nella scheda e nella pagina
--   prezzo_testo   cosa si legge AL POSTO della cifra, quando c'è
--
-- ⚠️ `prezzo_testo` riguarda **solo quello che si vede**. Il calcolo del totale
-- di una prenotazione continua a usare `price`, che resta la cifra vera: se i
-- due divergessero, si finirebbe per addebitare qualcosa di diverso da quello
-- che il cliente ha letto. Chi scrive «Alla carta» lascia `price` a zero e la
-- prenotazione vale zero — l'importo si fa al tavolo, che è il punto.
--
-- `mostra_prezzo` nasce a `true`: gli eventi che ci sono già continuano a
-- mostrare il prezzo esattamente come prima.

ALTER TABLE public.eventi
  ADD COLUMN IF NOT EXISTS mostra_prezzo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS prezzo_testo  text;

-- Sta al posto di una cifra, non di una descrizione.
ALTER TABLE public.eventi
  DROP CONSTRAINT IF EXISTS eventi_prezzo_testo_breve;
ALTER TABLE public.eventi
  ADD CONSTRAINT eventi_prezzo_testo_breve
  CHECK (prezzo_testo IS NULL OR char_length(prezzo_testo) <= 40);

-- Servono alla scheda pubblica: si concedono, una per una.
GRANT SELECT (mostra_prezzo, prezzo_testo) ON public.eventi TO anon;
GRANT SELECT (mostra_prezzo, prezzo_testo) ON public.eventi TO authenticated;

COMMENT ON COLUMN public.eventi.prezzo_testo IS
  'Cosa si legge al posto della cifra ("Alla carta", "Su richiesta"). Solo visualizzazione: il totale di una prenotazione usa sempre price.';
