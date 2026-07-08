-- Migration 066: colonne facet numeriche generiche per la Vetrina.
-- Abilitano il filtro per FASCIA su un 2°/3° numerico (km, durata, mq, lunghezza…)
-- oltre al prezzo (valore_primario). Il preset mappa quali campi → num1/num2
-- (vedi `numColumns` in lib/vetrinePresets.js); l'editor le popola al salvataggio.
-- I range su JSONB non sono indicizzabili → servono colonne vere.

ALTER TABLE public.vetrina_elementi ADD COLUMN IF NOT EXISTS num1 numeric(14,2);
ALTER TABLE public.vetrina_elementi ADD COLUMN IF NOT EXISTS num2 numeric(14,2);

CREATE INDEX IF NOT EXISTS vetrina_elementi_num1_idx ON public.vetrina_elementi (vetrina_id, num1);
CREATE INDEX IF NOT EXISTS vetrina_elementi_num2_idx ON public.vetrina_elementi (vetrina_id, num2);

-- Le colonne ereditano i GRANT/RLS della tabella (già impostati nella 065).
-- NB: gli elementi esistenti hanno num1/num2 = NULL finché non vengono ri-salvati
-- dall'admin (che le popola dal preset). I cataloghi sono nuovi → impatto ~0.
