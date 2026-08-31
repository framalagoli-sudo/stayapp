-- Anche gli eventi si possono far pagare.
--
-- `prenotazioni` ha già `pagamento_stato`, `pagamento_id` e `importo_totale`:
-- il booking era predisposto. `event_bookings` no — aveva solo `total_amount`,
-- cioè quanto costa, non se è stato incassato.
--
-- Le stesse colonne, con gli stessi nomi: un giorno prenotazioni ed eventi
-- potrebbero condividere il codice che li fa pagare, e due nomi diversi per la
-- stessa cosa sono l'inizio di due strade separate.

ALTER TABLE public.event_bookings
  ADD COLUMN IF NOT EXISTS pagamento_stato text NOT NULL DEFAULT 'non_richiesto',
  ADD COLUMN IF NOT EXISTS pagamento_id    text;

-- Catalogo chiuso, come per gli ordini. `non_richiesto` è il valore di partenza
-- ed è importante che sia diverso da `non_pagato`: la maggior parte degli
-- eventi è gratuita o si paga sul posto, e segnarli tutti «non pagati»
-- riempirebbe il pannello di allarmi falsi.
ALTER TABLE public.event_bookings
  DROP CONSTRAINT IF EXISTS event_bookings_pagamento_stato_check,
  ADD CONSTRAINT event_bookings_pagamento_stato_check
    CHECK (pagamento_stato IN ('non_richiesto', 'non_pagato', 'pagato', 'rimborsato'));

CREATE INDEX IF NOT EXISTS idx_event_bookings_pagamento
  ON public.event_bookings (event_id, pagamento_stato);

-- Ritrovare la prenotazione quando torna il pagamento: il webhook ha in mano
-- l'id della sessione, e da lì deve arrivare alla riga.
CREATE INDEX IF NOT EXISTS idx_event_bookings_pagamento_id
  ON public.event_bookings (pagamento_id) WHERE pagamento_id IS NOT NULL;

COMMENT ON COLUMN public.event_bookings.pagamento_stato IS
  'non_richiesto (gratis o si paga sul posto) | non_pagato | pagato | rimborsato';
COMMENT ON COLUMN public.event_bookings.pagamento_id IS
  'Sessione di pagamento Stripe (cs_...), sull''account del cliente.';

-- ⚠️ Nessun GRANT ad `anon`: chi prenota un evento non deve poter leggere se
-- gli altri hanno pagato. La route pubblica scrive con la chiave di servizio e
-- restituisce solo quello che serve a chi ha appena prenotato.
GRANT SELECT (pagamento_stato, pagamento_id) ON public.event_bookings TO authenticated;

-- regola-ok: nessuna tabella nuova, colonne su una tabella che ha gia permessi e RLS
