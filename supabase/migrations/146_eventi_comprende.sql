-- Cosa si compra prenotando un evento.
--
-- Sotto «Prenota» si leggeva «€30 / persona» e basta: che i 30 € fossero cena e
-- spettacolo lo diceva, se andava bene, il titolo. Le condizioni sotto il
-- pulsante servono ad altro (acconto, disdetta) e i pacchetti sono per chi ha
-- più scelte. Lo scrive il locale, mai dedotto dalla descrizione: è la stessa
-- trappola del «Gratuito» (migration 123).
--
--   comprende   una riga: «Cena (antipasto, primo, dolce) + spettacolo dal vivo»
--
-- Si legge sotto il prezzo, nel riepilogo prima della cassa, alla cassa di
-- Stripe, nelle email e nel pannello. Vuoto = non compare niente: gli eventi
-- che ci sono già restano come sono.

ALTER TABLE public.eventi
  ADD COLUMN IF NOT EXISTS comprende text;

ALTER TABLE public.eventi
  DROP CONSTRAINT IF EXISTS eventi_comprende_breve;
ALTER TABLE public.eventi
  ADD CONSTRAINT eventi_comprende_breve
  CHECK (comprende IS NULL OR char_length(comprende) <= 160);

-- Serve alla pagina pubblica dell'evento: si concede, colonna per colonna.
GRANT SELECT (comprende) ON public.eventi TO anon;
GRANT SELECT (comprende) ON public.eventi TO authenticated;

COMMENT ON COLUMN public.eventi.comprende IS
  'Cosa comprende il prezzo, scritto dal locale. Solo testo da leggere: il totale usa sempre price.';
