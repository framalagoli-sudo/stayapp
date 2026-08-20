-- Consenso a essere contattati su WhatsApp: è un consenso a sé, distinto da
-- quello della newsletter. Serve prima ancora del canale: senza, il giorno in cui
-- le campagne saranno pronte i clienti avrebbero liste piene di numeri che non
-- possono usare — e mandare comunque significa far bloccare il loro numero da Meta.
ALTER TABLE public.contatti ADD COLUMN IF NOT EXISTS whatsapp_optin boolean DEFAULT false;
ALTER TABLE public.contatti ADD COLUMN IF NOT EXISTS whatsapp_optin_il timestamptz;
-- Da dove arriva il consenso (form, vetrina, import, manuale): serve a dimostrarlo
-- se qualcuno contesta, e a capire quali canali funzionano.
ALTER TABLE public.contatti ADD COLUMN IF NOT EXISTS whatsapp_optin_fonte text;
ALTER TABLE public.contatti ADD COLUMN IF NOT EXISTS whatsapp_optout_il timestamptz;

-- I destinatari di una campagna si scelgono per tag + consenso: l'indice evita
-- la scansione completa quando le liste cresceranno.
CREATE INDEX IF NOT EXISTS contatti_whatsapp_optin_idx
  ON public.contatti (azienda_id, whatsapp_optin)
  WHERE whatsapp_optin = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contatti TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contatti TO service_role;
