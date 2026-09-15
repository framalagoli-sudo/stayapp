-- Credito AI in più per un solo mese.
--
-- Il tetto mensile (`ai_budget_mensile_usd`, migration 119) vale per sempre:
-- alzarlo per un cliente che ha finito il credito a metà mese vorrebbe dire
-- ricordarsi di riabbassarlo il primo del mese. Il credito extra invece vale
-- solo per il mese scritto accanto e il mese dopo non conta più, da solo.
--
-- Lo imposta solo il super_admin, da Aziende → Credito AI. Verificato il
-- 15/09/2026 che un cliente, con la propria sessione, non può aggiornare la
-- riga della sua azienda direttamente sul database (la RLS restituisce zero
-- righe): le colonne nuove seguono la stessa regola.

ALTER TABLE public.aziende
  ADD COLUMN IF NOT EXISTS ai_extra_usd  numeric(10,2),
  ADD COLUMN IF NOT EXISTS ai_extra_mese text;

-- Il mese è quello UTC in forma AAAA-MM, lo stesso con cui si somma la spesa.
DO $$ BEGIN
  ALTER TABLE public.aziende ADD CONSTRAINT aziende_ai_extra_mese_formato
    CHECK (ai_extra_mese IS NULL OR ai_extra_mese ~ '^\d{4}-(0[1-9]|1[0-2])$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.aziende ADD CONSTRAINT aziende_ai_importi_validi
    CHECK ((ai_extra_usd IS NULL OR ai_extra_usd BETWEEN 0 AND 1000)
       AND (ai_budget_mensile_usd IS NULL OR ai_budget_mensile_usd BETWEEN 0 AND 1000));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
