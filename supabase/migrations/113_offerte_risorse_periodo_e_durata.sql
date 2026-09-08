-- Le offerte sulle risorse: due assi, e un prezzo che dice cosa significa.
--
-- ⛔ Misurato l'08/09/2026 sul Furgone di Automax: il cliente aveva creato
-- «Ponte dell'8 dicembre», 5→9 dicembre, €850. Dal 5 al 9 il sito chiedeva
-- €600, identico a una settimana qualunque. `findPromo` viene chiamata **solo**
-- per gli slot orari: a giornate le offerte si compilano, si salvano e non
-- succede niente. Il motore c'era, la porta no.
--
-- ⛔ E `prezzo_speciale` non diceva cosa fosse. L'etichetta è «Prezzo speciale
-- (€)», punto. Con un listino da €120 al giorno e 5 giorni, quegli €850 valgono
-- €4.250 letti come prezzo giornaliero e €850 letti come prezzo del periodo. La
-- differenza è cinque volte il conto, e la sceglieva chi scriveva il codice
-- invece di chi vende. Adesso lo dichiara il cliente.
--
--   · 'giorno'  → sostituisce il prezzo di una giornata (o notte)
--   · 'periodo' → è il totale, comunque duri il soggiorno
--
-- Il default è 'giorno' perché è ciò che il campo ha sempre significato per gli
-- slot, dove sostituisce il prezzo dello slot: uniforme in tutto il sistema.
-- ⚠️ Le righe che esistono lo ereditano. Ce n'è **una sola**, quella di Automax,
-- e va confermata col cliente prima di pubblicarla: a 850 al giorno il ponte
-- costerebbe €4.250.
--
-- `minimo_notti` è il secondo asse: non *quando* si prenota ma *quanto dura* —
-- cinque giorni al prezzo di quattro. Vuoto = nessun minimo. Sta in notti come
-- ogni altro limite del booking, e il pannello lo mostra in giorni per chi conta
-- i giorni (`conta_giorno_uscita`): salvarlo nell'unità che si legge a schermo
-- farebbe divergere due numeri che devono restare lo stesso.
--
-- Colonne su tabella esistente → i GRANT di tabella e la RLS già in essere
-- restano validi (stessa ragione della migration 067).

ALTER TABLE public.risorse_promozioni
  ADD COLUMN IF NOT EXISTS prezzo_modo   text NOT NULL DEFAULT 'giorno',
  ADD COLUMN IF NOT EXISTS minimo_notti  integer;

-- Terzo muro sul valore che finisce nei conti: la route valida, il pannello
-- offre due sole scelte, e qui non entra nient'altro comunque.
ALTER TABLE public.risorse_promozioni
  DROP CONSTRAINT IF EXISTS risorse_promozioni_prezzo_modo_check;
ALTER TABLE public.risorse_promozioni
  ADD CONSTRAINT risorse_promozioni_prezzo_modo_check
  CHECK (prezzo_modo IN ('giorno', 'periodo'));

ALTER TABLE public.risorse_promozioni
  DROP CONSTRAINT IF EXISTS risorse_promozioni_minimo_notti_check;
ALTER TABLE public.risorse_promozioni
  ADD CONSTRAINT risorse_promozioni_minimo_notti_check
  CHECK (minimo_notti IS NULL OR minimo_notti >= 0);
