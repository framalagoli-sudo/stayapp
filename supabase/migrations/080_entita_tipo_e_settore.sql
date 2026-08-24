-- Separa due cose che stavano in un campo solo.
--
-- La verifica del passo 1 ha rivelato che `attivita.tipo` conteneva già
-- descrizioni libere del settore — "Investimenti immobiliari", "Scuola di lingue
-- e servizio traduzioni", "Creazioni con resina" — e non categorie tecniche.
-- È un uso sensato e va conservato: dice *cosa fa* quel cliente, serve all'AI
-- per scrivere i testi giusti e alla SEO.
--
-- Ma lo stesso campo deve anche dire su quale indirizzo pubblico va servita
-- l'entità (`/s/`, `/r/`, `/a/`) e quale preset applicare. Due lavori in un
-- campo solo: al passo 2, quando il codice comincerà a leggere da `entita`, il
-- routing di quei tre clienti si romperebbe.
--
--   tipo    → tecnico e chiuso: struttura | ristorante | attivita.
--             Decide l'indirizzo pubblico e il preset di partenza. NON limita
--             quali funzioni si possono usare: quello lo decidono i `moduli`.
--   settore → libero: "Creazioni con resina", "Studio legale", "Palestra".
--             Serve all'AI, alla SEO e alle etichette. Non ha effetti tecnici.

ALTER TABLE public.entita ADD COLUMN IF NOT EXISTS settore text;

-- Sposta le descrizioni libere nel campo giusto, e riporta `tipo` ai tre valori
-- tecnici. Tutto ciò che non è struttura o ristorante è un'attività: è già così
-- che il prodotto le serve oggi, su `/a/`.
UPDATE public.entita
SET settore = tipo,
    tipo    = 'attivita'
WHERE tipo NOT IN ('struttura', 'ristorante', 'attivita');

-- Normalizza l'accento: nel database convivevano 'attivita' e 'attività'.
UPDATE public.entita SET tipo = 'attivita' WHERE tipo = 'attività';

ALTER TABLE public.entita
  ADD CONSTRAINT entita_tipo_valido CHECK (tipo IN ('struttura', 'ristorante', 'attivita'));

CREATE INDEX IF NOT EXISTS entita_settore_idx ON public.entita (settore);
