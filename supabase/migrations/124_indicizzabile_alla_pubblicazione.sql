-- Un sito che viene pubblicato si fa trovare, a meno che il cliente non dica no.
--
-- ⛔ Dal 14/09 ogni entità nuova nasce **invisibile ai motori di ricerca**
-- (`indicizzabile DEFAULT false`, migration 116), ed è giusto: il giorno della
-- registrazione il sito contiene il testo di esempio, e quello fotograferebbe
-- Google. Ma **nessun passaggio ricordava di accendere l'interruttore**: un
-- cliente poteva pubblicare il sito e restare fuori da Google per sempre senza
-- sapere perché. Misurato il 18/09: era così per tutti i siti nuovi.
--
-- Da qui in poi: quando il cliente **pubblica** il sito, la visibilità si
-- accende da sola — perché pubblicare vuol dire «adesso è vero». Resta un
-- interruttore, e chi lo spegne non se lo ritrova riacceso: è a questo che
-- serve `indicizzabile_scelto`, che registra **una decisione presa da una
-- persona** e non si tocca più da soli.

ALTER TABLE public.entita
  ADD COLUMN IF NOT EXISTS indicizzabile_scelto boolean NOT NULL DEFAULT false;

-- Chi è già visibile ha già la sua situazione: si marca come deciso, così
-- nessuna automazione futura ci mette mano.
UPDATE public.entita SET indicizzabile_scelto = true WHERE indicizzabile = true;

-- ⚠️ La colonna NON si concede al ruolo pubblico: è un dato di gestione, e su
-- `entita` ogni colonna nuova nasce invisibile a chi non ha fatto login
-- (regola della migration 082).
GRANT SELECT (indicizzabile_scelto), UPDATE (indicizzabile_scelto) ON public.entita TO authenticated;
GRANT SELECT (indicizzabile_scelto), UPDATE (indicizzabile_scelto), INSERT (indicizzabile_scelto) ON public.entita TO service_role;
