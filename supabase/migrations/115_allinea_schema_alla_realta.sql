-- Quello che c'è in produzione e non è mai stato scritto in una migration.
--
-- `CLAUDE.md` dice che le migration sono «l'unica fonte di verità sulle
-- tabelle». Il 13/09/2026 la prova di ripristino ha dimostrato che non era
-- vero: ricostruendo il database da zero mancavano **4 tabelle e 12 colonne**,
-- aggiunte negli anni dal pannello di Supabase e mai riportate qui. Un archivio
-- dei dati perfetto non serve a niente se il database in cui rimetterli non si
-- ricostruisce.
--
-- Niente di tutto questo cambia la produzione: `IF NOT EXISTS` ovunque, e i
-- tipi sono quelli letti dal database vero, non inventati. Serve al ripristino.
--
-- (Le colonne di `properties` stanno in `078b`, perché devono esistere prima
-- della 079 che crea `entita`.)

-- ── contatti ────────────────────────────────────────────────────────────────
ALTER TABLE public.contatti ADD COLUMN IF NOT EXISTS pipeline_stage text;

-- ── prenotazioni ────────────────────────────────────────────────────────────
-- Il consenso di chi prenota — quando, e quale formula ha letto — è una prova,
-- non un dettaglio: senza queste colonne un ripristino perderebbe proprio la
-- parte che l'articolo 7 del GDPR chiede di poter ricostruire.
ALTER TABLE public.prenotazioni ADD COLUMN IF NOT EXISTS offerta_id uuid REFERENCES public.offerte(id) ON DELETE SET NULL;
ALTER TABLE public.prenotazioni ADD COLUMN IF NOT EXISTS messaggio text;
ALTER TABLE public.prenotazioni ADD COLUMN IF NOT EXISTS privacy_accettata boolean NOT NULL DEFAULT false;
ALTER TABLE public.prenotazioni ADD COLUMN IF NOT EXISTS privacy_accettata_il timestamptz;
ALTER TABLE public.prenotazioni ADD COLUMN IF NOT EXISTS privacy_testo text;

-- ── entity_translations ─────────────────────────────────────────────────────
-- La cache delle traduzioni: senza, ogni pagina in inglese verrebbe ritradotta
-- da capo a pagamento dopo un ripristino.
CREATE TABLE IF NOT EXISTS public.entity_translations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_tipo  text NOT NULL,
  entity_id    uuid NOT NULL,
  lang         text NOT NULL,
  source_hash  text NOT NULL,
  translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  overrides    jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS entity_translations_chiave_idx
  ON public.entity_translations (entity_tipo, entity_id, lang);

-- ── webhooks ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.webhooks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id uuid REFERENCES public.aziende(id) ON DELETE CASCADE,
  nome       text NOT NULL,
  url        text NOT NULL,
  eventi     text[] DEFAULT '{}',
  attivo     boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS webhooks_azienda_idx ON public.webhooks (azienda_id);

-- ── permessi e secondo muro (nota 19 del CLAUDE.md) ─────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entity_translations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entity_translations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhooks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhooks TO service_role;
-- Nessun GRANT al ruolo `anon`: le traduzioni le serve il server, e i webhook
-- di un cliente — con i loro indirizzi — non sono roba da pagina pubblica.
ALTER TABLE public.entity_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
