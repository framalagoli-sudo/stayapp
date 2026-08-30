-- Un ordine ha due stati, non uno.
--
-- Oggi `ordini.stato` è un campo solo che mescola due domande diverse:
--   in_attesa · pagato · in_lavorazione · spedito · consegnato · annullato
--
-- Ma «pagato» e «spedito» non sono due punti della stessa linea: sono due
-- risposte a due domande — **ho incassato?** e **è partito?** — e capitano in
-- qualsiasi ordine. Con un campo solo non si può dire «pagato ma non ancora
-- spedito», né «spedito in contrassegno, incasso alla consegna»: scrivendo uno
-- dei due si cancella l'altro. È il motivo per cui Shopify tiene *Payment
-- status* e *Fulfillment status* separati, e chiunque abbia gestito un negozio
-- sa perché.
--
-- ⚠️ Si fa **adesso** perché la tabella è vuota: zero ordini, nessun dato da
-- migrare, nessun cliente che si accorge di niente. Con cento ordini dentro
-- sarebbe stato un lavoro di riconciliazione.
--
-- `stato` resta e continua a funzionare: è ancora quello che il cliente legge
-- nell'email e che le route scrivono. Qui si aggiungono le due colonne che
-- rispondono alle domande vere, e un trigger le tiene allineate a `stato`
-- finché il pannello non scriverà direttamente loro.

ALTER TABLE public.ordini
  ADD COLUMN IF NOT EXISTS pagamento_stato text NOT NULL DEFAULT 'non_pagato',
  ADD COLUMN IF NOT EXISTS evasione_stato  text NOT NULL DEFAULT 'da_evadere';

-- Cataloghi chiusi: uno stato che arriva da fuori non deve poter essere una
-- stringa qualsiasi. La validazione in route è la prima difesa, questa è la
-- seconda — e vale anche per la service_role, che scavalca la RLS.
ALTER TABLE public.ordini
  DROP CONSTRAINT IF EXISTS ordini_pagamento_stato_check,
  ADD CONSTRAINT ordini_pagamento_stato_check
    CHECK (pagamento_stato IN ('non_pagato', 'pagato', 'rimborsato'));

ALTER TABLE public.ordini
  DROP CONSTRAINT IF EXISTS ordini_evasione_stato_check,
  ADD CONSTRAINT ordini_evasione_stato_check
    CHECK (evasione_stato IN ('da_evadere', 'in_lavorazione', 'spedito', 'consegnato', 'annullato'));

CREATE INDEX IF NOT EXISTS idx_ordini_pagamento ON public.ordini (azienda_id, pagamento_stato);
CREATE INDEX IF NOT EXISTS idx_ordini_evasione  ON public.ordini (azienda_id, evasione_stato);

COMMENT ON COLUMN public.ordini.pagamento_stato IS 'Ho incassato? non_pagato | pagato | rimborsato';
COMMENT ON COLUMN public.ordini.evasione_stato  IS 'È partito? da_evadere | in_lavorazione | spedito | consegnato | annullato';

-- Finché `stato` resta la colonna che il resto del codice scrive, le due nuove
-- lo seguono da sole. Così una route non ancora aggiornata non lascia indietro
-- i due stati — e il pannello mostra sempre la verità.
--
-- ⚠️ Il trigger scrive solo quando `stato` cambia davvero: senza quel controllo,
-- aggiornare le due colonne dal pannello verrebbe subito sovrascritto.
CREATE OR REPLACE FUNCTION public.ordini_allinea_stati()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.stato IS DISTINCT FROM OLD.stato THEN
    NEW.pagamento_stato := CASE
      WHEN NEW.stato IN ('pagato', 'in_lavorazione', 'spedito', 'consegnato') THEN 'pagato'
      ELSE 'non_pagato'
    END;
    NEW.evasione_stato := CASE
      WHEN NEW.stato = 'annullato'      THEN 'annullato'
      WHEN NEW.stato = 'consegnato'     THEN 'consegnato'
      WHEN NEW.stato = 'spedito'        THEN 'spedito'
      WHEN NEW.stato = 'in_lavorazione' THEN 'in_lavorazione'
      ELSE 'da_evadere'
    END;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ordini_allinea_stati ON public.ordini;
CREATE TRIGGER trg_ordini_allinea_stati
  BEFORE INSERT OR UPDATE ON public.ordini
  FOR EACH ROW EXECUTE FUNCTION public.ordini_allinea_stati();

-- Allinea le righe già presenti (oggi zero, ma la migration deve valere anche
-- se qualcuno la esegue più tardi su un database che nel frattempo ha ordini).
UPDATE public.ordini SET stato = stato;

-- regola-ok: nessuna tabella nuova, colonne su una tabella che ha gia permessi e RLS
