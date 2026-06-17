-- 061_azienda_dati_legali.sql
-- Campi legali per le società di capitali (s.r.l., s.p.a.), da mostrare nel footer
-- del minisito insieme a P.IVA/ragione sociale/sede già esistenti.
-- Opzionali: una ditta individuale o un business estero li lascia vuoti.

ALTER TABLE public.aziende ADD COLUMN IF NOT EXISTS rea text;
ALTER TABLE public.aziende ADD COLUMN IF NOT EXISTS capitale_sociale text;

-- I grant a livello tabella su public.aziende sono già presenti (authenticated/service_role).
-- anon legge i dati legali solo in modo derivato via /api/guest/* (service role), non direttamente.
