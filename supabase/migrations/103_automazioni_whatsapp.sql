-- Il promemoria può arrivare anche su WhatsApp.
--
-- Il canale sta sulla RIGA DI CODA, non solo sullo step: uno step «email e
-- WhatsApp» produce due righe, che partono, falliscono e si leggono
-- separatamente. Se il numero non è collegato deve fallire il WhatsApp e
-- arrivare comunque l'email — non perdersi tutt'e due insieme.

ALTER TABLE public.automazioni_log
  ADD COLUMN IF NOT EXISTS canale           text NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS contact_telefono text;

DO $$ BEGIN
  ALTER TABLE public.automazioni_log
    ADD CONSTRAINT automazioni_log_canale_chk CHECK (canale IN ('email','whatsapp'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Un messaggio WhatsApp ha un numero, non un indirizzo: pretendere l'email
-- anche lì significherebbe non poter mettere in coda un invio perfettamente
-- valido. Il recapito che serve lo controlla il codice, canale per canale.
ALTER TABLE public.automazioni_log ALTER COLUMN contact_email DROP NOT NULL;

-- La coda esisteva già; i grant e la RLS restano quelli della 029.
