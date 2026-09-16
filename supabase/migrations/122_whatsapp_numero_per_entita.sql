-- Un numero WhatsApp per entità, non uno per azienda.
--
-- Deciso il 16/09/2026: il collegamento con Meta resta UNO per azienda (un solo
-- accesso, un solo token), ma un'azienda con più attività — il ristorante e
-- l'officina — deve poter scrivere a ciascuna dal proprio numero. Finché il
-- vincolo è `UNIQUE (azienda_id)` quel caso non è rappresentabile, e rifarlo
-- dopo significherebbe far ricollegare tutti i clienti.
--
-- `entity_id` NULL = numero dell'AZIENDA, valido per le entità che non ne hanno
-- uno proprio. È il caso di chi ha una sola attività, cioè quasi tutti oggi.

-- Il vincolo nasce da `UNIQUE` nella colonna (migration 075) e il nome lo ha
-- scelto Postgres: lo si cerca invece di indovinarlo.
DO $$
DECLARE nome text;
BEGIN
  SELECT c.conname INTO nome
  FROM pg_constraint c
  WHERE c.conrelid = 'public.whatsapp_account'::regclass
    AND c.contype = 'u'
    AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute
                          WHERE attrelid = 'public.whatsapp_account'::regclass AND attname = 'azienda_id')];
  IF nome IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.whatsapp_account DROP CONSTRAINT %I', nome);
  END IF;
END $$;

-- Cancellata l'entità, il suo numero non ha più un posto: la riga se ne va con
-- lei (il collegamento su Meta resta, si riassegna ricollegando).
ALTER TABLE public.whatsapp_account
  ADD COLUMN IF NOT EXISTS entity_id uuid REFERENCES public.entita(id) ON DELETE CASCADE;

-- Un solo numero per entità, e un solo numero «generale» per azienda.
-- Due indici parziali invece di un vincolo solo: in SQL NULL non è uguale a
-- NULL, quindi `UNIQUE (azienda_id, entity_id)` lascerebbe passare dieci righe
-- generali per la stessa azienda.
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_account_entita_uniq
  ON public.whatsapp_account (azienda_id, entity_id) WHERE entity_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_account_generale_uniq
  ON public.whatsapp_account (azienda_id) WHERE entity_id IS NULL;

-- Lo stesso numero non può stare su due aziende: se ricompare, è perché qualcuno
-- lo ha ricollegato altrove e il collegamento vecchio va tolto, non duplicato.
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_account_numero_uniq
  ON public.whatsapp_account (phone_number_id) WHERE phone_number_id IS NOT NULL;

COMMENT ON COLUMN public.whatsapp_account.entity_id IS
  'Entità che usa questo numero. NULL = numero dell''azienda, usato da chi non ne ha uno proprio.';
