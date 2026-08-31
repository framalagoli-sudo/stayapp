-- Quanto si paga prenotando.
--
-- Un **numero**, non una tendina con tre voci:
--   0    → si paga sul posto (com'è oggi, e resta il valore predefinito)
--   100  → si paga tutto subito
--   30   → acconto del 30%, il saldo dopo
--
-- Perché un numero e non un elenco di scelte: «tutto», «acconto», «niente»
-- sarebbero tre nomi nostri per la stessa informazione, e il giorno che un
-- cliente vuole il 15% dovremmo aggiungere una voce. Il numero copre anche i
-- casi che non abbiamo previsto — ed è la stessa regola per cui le offerte
-- hanno la categoria a campo libero.
--
-- ⚠️ **0 è il valore di partenza per tutti.** Chi prenota oggi non deve
-- trovarsi un pagamento da fare senza che nessuno l'abbia deciso: incassare
-- online si accende, non si eredita.

ALTER TABLE public.risorse
  ADD COLUMN IF NOT EXISTS acconto_percentuale integer NOT NULL DEFAULT 0;

ALTER TABLE public.eventi
  ADD COLUMN IF NOT EXISTS acconto_percentuale integer NOT NULL DEFAULT 0;

-- Fra 0 e 100: un valore fuori scala verrebbe moltiplicato per un prezzo e
-- diventerebbe un addebito. La validazione sta nella route, questo è il muro
-- che vale anche per la chiave di servizio.
ALTER TABLE public.risorse
  DROP CONSTRAINT IF EXISTS risorse_acconto_check,
  ADD CONSTRAINT risorse_acconto_check CHECK (acconto_percentuale BETWEEN 0 AND 100);

ALTER TABLE public.eventi
  DROP CONSTRAINT IF EXISTS eventi_acconto_check,
  ADD CONSTRAINT eventi_acconto_check CHECK (acconto_percentuale BETWEEN 0 AND 100);

COMMENT ON COLUMN public.risorse.acconto_percentuale IS
  'Quanto si paga prenotando: 0 = sul posto, 100 = tutto, 30 = acconto del 30%.';
COMMENT ON COLUMN public.eventi.acconto_percentuale IS
  'Quanto si paga prenotando: 0 = sul posto, 100 = tutto, 30 = acconto del 30%.';

-- Serve a chi prenota per sapere **prima** se dovrà pagare: la colonna esce
-- dalle route pubbliche, quindi il permesso va concesso una per una.
GRANT SELECT (acconto_percentuale) ON public.risorse TO anon;
GRANT SELECT (acconto_percentuale) ON public.risorse TO authenticated;
GRANT SELECT (acconto_percentuale) ON public.eventi TO anon;
GRANT SELECT (acconto_percentuale) ON public.eventi TO authenticated;

-- ⚠️ Dove finisce la sessione di pagamento di una prenotazione: `prenotazioni`
-- ha già `pagamento_id`, `event_bookings` l'ha presa con la `100`. Qui non
-- serve altro — il webhook cerca la stessa sessione nelle tre tabelle.

-- regola-ok: nessuna tabella nuova, colonne su tabelle che hanno gia permessi e RLS
