-- 139 — Resoconti per email ai titolari (STRATEGIA.md §6.4 punto 3)
--
-- Il lunedì il riepilogo della settimana prima, il 1° del mese il report del
-- mese prima: i numeri del cruscotto, mandati a chi amministra l'azienda.
--
-- Nasce SPENTO: lo accende il proprietario della piattaforma da Impostazioni
-- (`platform_config.resoconti_attivi`). Finché è spento non parte niente e il
-- titolare non vede nessuna scelta nel pannello.

-- 1. L'interruttore della piattaforma.
ALTER TABLE public.platform_config
  ADD COLUMN IF NOT EXISTS resoconti_attivi boolean NOT NULL DEFAULT false;

-- 2. La scelta di ogni persona: cosa vuole ricevere.
--    entrambi = settimanale e mensile · mensile = solo il mese · nessuno
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS resoconti text NOT NULL DEFAULT 'entrambi'
  CHECK (resoconti IN ('entrambi', 'mensile', 'nessuno'));

-- 3. Il registro degli invii: la stessa persona non riceve due volte lo stesso
--    periodo, anche se il processo gira ogni ora o due volte insieme. La riga si
--    scrive PRIMA di mandare (chi non riesce a scriverla non manda).
CREATE TABLE IF NOT EXISTS public.resoconti_inviati (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  azienda_id  uuid NOT NULL REFERENCES public.aziende(id) ON DELETE CASCADE,
  tipo        text NOT NULL CHECK (tipo IN ('settimanale', 'mensile')),
  periodo     text NOT NULL,              -- «2026-10-12» (lunedì) · «2026-09» (mese)
  inviato_il  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, tipo, periodo)
);

CREATE INDEX IF NOT EXISTS resoconti_inviati_azienda ON public.resoconti_inviati (azienda_id);

-- Solo le route (service_role) la toccano: nessun accesso dal browser.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resoconti_inviati TO service_role;
ALTER TABLE public.resoconti_inviati ENABLE ROW LEVEL SECURITY;

-- 4. Il battito del processo: gira ogni ora, fermo oltre tre ore = guasto.
INSERT INTO public.cron_battiti (nome, soglia_minuti) VALUES ('resoconti', 180)
ON CONFLICT (nome) DO UPDATE SET soglia_minuti = EXCLUDED.soglia_minuti;
