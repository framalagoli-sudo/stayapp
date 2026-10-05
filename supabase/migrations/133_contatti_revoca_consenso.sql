-- 133 — Quando una persona ritira il consenso alle promozioni, resta scritto.
--
-- Fino a oggi la disiscrizione spegneva `iscritto_newsletter` e basta: non
-- restava né la data né il modo. In una contestazione («vi avevo detto di
-- smettere») non c'era niente da mostrare — e la prova del consenso restava in
-- scheda come se valesse ancora.
--
-- La prova del sì (`marketing_consenso_*`) NON si cancella: dice cosa era stato
-- accettato. Accanto si scrive il no: quando, e da dove è arrivato.
-- Un nuovo sì azzera queste due colonne.
--
-- Nessuna colonna pubblica: `contatti` non è leggibile senza sessione.

BEGIN;

ALTER TABLE public.contatti ADD COLUMN IF NOT EXISTS marketing_revoca_il timestamptz;
ALTER TABLE public.contatti ADD COLUMN IF NOT EXISTS marketing_revoca_fonte text;

ALTER TABLE public.contatti DROP CONSTRAINT IF EXISTS contatti_marketing_revoca_fonte_check;
ALTER TABLE public.contatti ADD CONSTRAINT contatti_marketing_revoca_fonte_check
  CHECK (marketing_revoca_fonte IS NULL OR char_length(marketing_revoca_fonte) <= 200);

COMMIT;
