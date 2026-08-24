-- Battito dei processi automatici.
--
-- Gli allarmi esistenti scattano quando un cron FALLISCE. Ma il guasto più
-- insidioso è l'altro: quello che smette di girare del tutto. Il silenzio non
-- lo intercetta un try/catch — nessuno lancia un'eccezione se una funzione non
-- viene mai chiamata. È così che il webhook dei rimbalzi è rimasto muto 45
-- giorni e nessuno se n'è accorto.
--
-- Ogni processo qui lascia un segno quando ha lavorato. Chi gira dopo controlla
-- che gli altri non siano fermi da troppo tempo, e in quel caso avvisa.

CREATE TABLE IF NOT EXISTS public.cron_battiti (
  nome         text PRIMARY KEY,
  ultimo_ok    timestamptz NOT NULL DEFAULT now(),
  -- Dopo quanti minuti di assenza il processo va considerato fermo. È una
  -- soglia per processo perché le cadenze sono diverse: la newsletter gira ogni
  -- minuto, il backup una volta al giorno.
  soglia_minuti integer NOT NULL DEFAULT 60,
  esecuzioni   bigint NOT NULL DEFAULT 0,
  ultimo_esito text
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cron_battiti TO service_role;
GRANT SELECT ON public.cron_battiti TO authenticated;
ALTER TABLE public.cron_battiti ENABLE ROW LEVEL SECURITY;

-- Nessuna policy per `authenticated`: la tabella si legge solo dalle route, che
-- usano la service_role. Il pannello la vede attraverso /api/admin/diagnostica,
-- che è già riservata al super_admin.

-- Soglie iniziali, generose rispetto alla cadenza reale: meglio accorgersi con
-- un po' di ritardo che ricevere falsi allarmi a ogni rallentamento di Vercel.
INSERT INTO public.cron_battiti (nome, soglia_minuti) VALUES
  ('newsletter',   15),    -- gira ogni minuto
  ('automazioni',  15),    -- gira ogni minuto
  ('whatsapp',     30),    -- ogni 5 minuti
  ('domini',       60),    -- ogni 15 minuti
  ('blog',        180),    -- ogni ora
  ('backup',     1800)     -- una volta al giorno, alle 3
ON CONFLICT (nome) DO UPDATE SET soglia_minuti = EXCLUDED.soglia_minuti;
