-- «Questo sito è visibile ai motori di ricerca?»
--
-- Fino a oggi la risposta era una sola: se il minisito è acceso, Google lo
-- vede. Non c'era modo di dire «questo sito esiste ma non è pronto» — e i due
-- siti di prova erano indicizzabili come quelli dei clienti veri.
--
-- ⚠️ Le due righe non sono un doppione, fanno cose diverse:
--   · la PRIMA dà `true` alle entità che esistono già → i clienti veri non
--     spariscono da Google per colpa di questa migration;
--   · la SECONDA cambia il predefinito per quelle che nascono da domani →
--     un sito nuovo nasce invisibile, e lo si accende quando è pronto.
--     Un sito vuoto indicizzato è peggio di un sito non indicizzato: quello
--     che Google fotografa il primo giorno è il testo di esempio.
--
-- Rieseguirla non fa danni: la colonna c'è già e il default è già quello.

ALTER TABLE public.entita
  ADD COLUMN IF NOT EXISTS indicizzabile boolean NOT NULL DEFAULT true;

ALTER TABLE public.entita
  ALTER COLUMN indicizzabile SET DEFAULT false;

-- Nessun GRANT al ruolo `anon`: la decidono le pagine, che girano sul server
-- con la chiave di servizio. Dalla migration 082 ogni colonna nuova su
-- `entita` nasce invisibile al pubblico, e questa ci resta.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entita TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entita TO service_role;
