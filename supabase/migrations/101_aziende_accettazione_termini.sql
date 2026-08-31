-- Quando un cliente ha accettato i Termini, e quale testo ha letto.
--
-- ⚠️ **Un consenso è una prova, non un booleano.** Vale per il consenso privacy
-- di chi prenota, e vale a maggior ragione per il contratto con chi paga: se
-- domani i Termini cambiano, le accettazioni vecchie devono restare
-- ricostruibili — altrimenti non si sa più cosa ha accettato chi.
--
-- Si conserva: **quando** e **quale versione**. Non il testo intero, che sta in
-- git con la sua storia: basta la data della versione per ritrovarlo.

ALTER TABLE public.aziende
  ADD COLUMN IF NOT EXISTS termini_accettati_il      timestamptz,
  ADD COLUMN IF NOT EXISTS termini_versione          text;

COMMENT ON COLUMN public.aziende.termini_accettati_il IS
  'Quando i Termini sono stati accettati. NULL = azienda nata prima che esistessero (31/08/2026).';
COMMENT ON COLUMN public.aziende.termini_versione IS
  'Quale versione dei Termini è stata accettata, per data di entrata in vigore.';

-- Lettura a chi ha una sessione: serve al pannello per sapere se chiedere
-- l'accettazione a un cliente più vecchio del contratto.
GRANT SELECT (termini_accettati_il, termini_versione) ON public.aziende TO authenticated;

-- ⚠️ Nessun GRANT di UPDATE: la scrive solo la route, con la chiave di servizio.
-- Un'accettazione che l'interessato può scriversi da solo non è una prova.

-- ⚠️ Le 11 aziende esistenti restano a NULL **di proposito**: non hanno mai
-- accettato niente, perché i Termini non esistevano. Segnarle come consenzienti
-- sarebbe una bugia scritta nel database. Andranno fatte accettare al primo
-- accesso utile — è un lavoro di prodotto, non una UPDATE.

-- regola-ok: nessuna tabella nuova, colonne su una tabella che ha gia permessi e RLS
