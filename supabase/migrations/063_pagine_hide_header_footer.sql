-- Opzione B: ogni pagina può nascondere header e/o footer (es. landing page
-- distraction-free). Default: mostrati (comportamento site-wide invariato).
-- Le colonne ereditano i grant già presenti sulla tabella pagine.

ALTER TABLE public.pagine
  ADD COLUMN IF NOT EXISTS hide_header boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hide_footer boolean NOT NULL DEFAULT false;
