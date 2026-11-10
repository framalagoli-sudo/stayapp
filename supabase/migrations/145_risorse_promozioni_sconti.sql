-- Le offerte sulle risorse: sconti, prenotazione anticipata, last minute,
-- pacchetti che si ripetono (fase 2 del calendario dei prezzi, richiesta di
-- Automax).
--
-- Fino a qui un'offerta sapeva fare una cosa sola: **sostituire il prezzo**
-- (al giorno o per tutto il periodo). Mancavano i modi in cui un'attività
-- ragiona davvero:
--   · «-15% da 7 giorni in su»            → sconto in percentuale
--   · «-20 € sul noleggio»                → sconto di un importo
--   · «-10% a chi prenota 30 giorni prima» → prenotazione anticipata
--   · «-25% se parti entro 3 giorni»       → last minute
--   · «ven→lun 300 € ogni weekend»         → pacchetto che si ripete
--
-- ⚠️ Il default di una migration decide anche per le righe che ci sono già
-- (successo l'08/09: il sito di Automax ha mostrato €4.250 invece di €600).
-- Qui `sconto_tipo` nasce 'prezzo' — esattamente quello che le offerte
-- esistenti sono — e tutte le colonne nuove nascono vuote, cioè «nessuna
-- condizione». Nessuna offerta esistente cambia significato.
--
-- Le offerte restano **non cumulabili**: vince la più conveniente per chi
-- prenota (decisione di Francesco del 09/11).

ALTER TABLE public.risorse_promozioni
  ADD COLUMN IF NOT EXISTS sconto_tipo           text NOT NULL DEFAULT 'prezzo',
  ADD COLUMN IF NOT EXISTS sconto_valore         numeric,
  ADD COLUMN IF NOT EXISTS prenota_prima_giorni  integer,  -- almeno N giorni prima dell'inizio
  ADD COLUMN IF NOT EXISTS prenota_entro_giorni  integer,  -- al massimo N giorni prima dell'inizio
  ADD COLUMN IF NOT EXISTS durata_esatta         integer;  -- in notti: pacchetto che si ripete

-- Uno sconto non ha un «prezzo speciale»: la colonna diventa facoltativa, ma
-- resta obbligatoria per le offerte a prezzo (vedi il vincolo sotto).
ALTER TABLE public.risorse_promozioni ALTER COLUMN prezzo_speciale DROP NOT NULL;

ALTER TABLE public.risorse_promozioni DROP CONSTRAINT IF EXISTS risorse_promozioni_sconto_tipo_check;
ALTER TABLE public.risorse_promozioni ADD CONSTRAINT risorse_promozioni_sconto_tipo_check
  CHECK (sconto_tipo IN ('prezzo', 'percentuale', 'importo'));

-- Ogni tipo ha il suo numero, e il numero ha senso.
ALTER TABLE public.risorse_promozioni DROP CONSTRAINT IF EXISTS risorse_promozioni_valori_check;
ALTER TABLE public.risorse_promozioni ADD CONSTRAINT risorse_promozioni_valori_check CHECK (
  (sconto_tipo = 'prezzo'      AND prezzo_speciale IS NOT NULL AND prezzo_speciale >= 0) OR
  (sconto_tipo = 'percentuale' AND sconto_valore > 0 AND sconto_valore <= 100) OR
  (sconto_tipo = 'importo'     AND sconto_valore > 0)
);

ALTER TABLE public.risorse_promozioni DROP CONSTRAINT IF EXISTS risorse_promozioni_anticipo_check;
ALTER TABLE public.risorse_promozioni ADD CONSTRAINT risorse_promozioni_anticipo_check CHECK (
  (prenota_prima_giorni IS NULL OR prenota_prima_giorni BETWEEN 0 AND 730) AND
  (prenota_entro_giorni IS NULL OR prenota_entro_giorni BETWEEN 0 AND 730) AND
  (durata_esatta IS NULL OR durata_esatta BETWEEN 0 AND 365)
);

-- Le colonne nuove si leggono solo dalle route (chiave di servizio), come il
-- resto della tabella: nessun permesso nuovo da concedere.

COMMENT ON COLUMN public.risorse_promozioni.sconto_tipo IS
  'prezzo = sostituisce il prezzo (prezzo_speciale, prezzo_modo); percentuale / importo = sconto sul conto del calendario (sconto_valore).';
COMMENT ON COLUMN public.risorse_promozioni.prenota_prima_giorni IS
  'Prenotazione anticipata: vale solo se mancano almeno N giorni all''inizio (nel fuso dell''azienda).';
COMMENT ON COLUMN public.risorse_promozioni.prenota_entro_giorni IS
  'Last minute: vale solo se mancano al massimo N giorni all''inizio.';
COMMENT ON COLUMN public.risorse_promozioni.durata_esatta IS
  'Pacchetto che si ripete: con prezzo per tutto il periodo, vale per questa durata esatta (in notti), nei giorni d''inizio indicati, dentro le date se ci sono.';

-- regola-ok: nessuna tabella nuova, colonne su una tabella che ha già permessi e RLS
