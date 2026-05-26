-- PWA per attività: toggle globale + moduli per-entità
ALTER TABLE attivita
  ADD COLUMN IF NOT EXISTS pwa jsonb
  DEFAULT '{"active":false,"modules":{"servizi":true,"galleria":true,"contatta":true}}';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attivita TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attivita TO service_role;
