-- 130 — Il registro di quello che fa un contatto, e il numero di telefono come
--       seconda chiave per riconoscere la stessa persona.
--
-- Misurato in produzione il 04/10/2026 (116 contatti, sei aziende):
--  · «cosa ha fatto questa persona» stava in due posti che non si possono
--    interrogare: i tag (un miscuglio di parole nostre — «lead», «struttura»,
--    «pwa» — nomi di moduli e titoli interi di eventi) e un testo libero nelle
--    note («[03/10] Ha prenotato … 12 posti»). Da lì non si ricava né una lista
--    («chi è venuto a quella serata») né un ordine («chi non si vede da più
--    tempo»);
--  · otto porte creano contatti, ognuna con le sue regole; tre non ne creano
--    affatto (risorse, offerte, ordini del negozio);
--  · un contatto si riconosce SOLO dall'email. Chi arriva da WhatsApp — e ne
--    arriveranno molti — ha un numero e nessuna email: oggi non entrerebbe.
--
-- Qui nasce il registro (`contatti_attivita`): una riga per ogni cosa che la
-- persona ha fatto, scritta da una porta sola (`lib/crm.js`). Da quella si
-- leggono le liste, la storia nella scheda e i conteggi.
--
-- ⚠️ Nel registro NON entrano dati personali: né nomi, né email, né telefoni.
-- Dice «ha prenotato l'evento X, 2 posti», e chi sia lo dice `contatto_id`.
-- Cancellato il contatto, la riga se ne va con lui.
--
-- Nessun dato esistente viene modificato da questa migration. La storia dei
-- contatti già presenti la ricostruisce `tests/ricostruisci-attivita-contatti.mjs`,
-- che simula soltanto finché non gli si passa `--esegui`.

BEGIN;

-- ── 1. Il telefono come chiave ──────────────────────────────────────────────
-- `telefono` resta com'è stato scritto (è quello che il titolare legge). Qui
-- va la forma internazionale (+39…), calcolata dal codice con la stessa
-- funzione dell'import (`normalizzaTelefono`): è l'unica confrontabile, ed è
-- quella che manda WhatsApp.
ALTER TABLE public.contatti ADD COLUMN IF NOT EXISTS telefono_e164 text
  CHECK (telefono_e164 IS NULL OR telefono_e164 ~ '^\+[0-9]{8,15}$');

CREATE INDEX IF NOT EXISTS contatti_azienda_telefono_idx
  ON public.contatti (azienda_id, telefono_e164) WHERE telefono_e164 IS NOT NULL;
CREATE INDEX IF NOT EXISTS contatti_azienda_email_idx
  ON public.contatti (azienda_id, lower(email)) WHERE email IS NOT NULL;

-- ── 2. Il riepilogo sul contatto ────────────────────────────────────────────
-- Servono a ordinare la tabella («chi è venuto più volte», «chi non si vede da
-- più tempo») senza sommare a ogni apertura della pagina. Li tiene allineati
-- il trigger qui sotto, contando: un contatore che si incrementa può
-- divergere, un conteggio no.
ALTER TABLE public.contatti ADD COLUMN IF NOT EXISTS attivita_numero integer NOT NULL DEFAULT 0;
ALTER TABLE public.contatti ADD COLUMN IF NOT EXISTS ultima_attivita_il timestamptz;
ALTER TABLE public.contatti ADD COLUMN IF NOT EXISTS ultima_attivita_tipo text;
ALTER TABLE public.contatti ADD COLUMN IF NOT EXISTS ultima_attivita_titolo text;

-- ── 3. La prova del consenso alla promozione ────────────────────────────────
-- `iscritto_newsletter` resta l'interruttore. Queste dicono quando è stato
-- dato, quale frase la persona ha letto e dove: un consenso è una prova, non
-- una spunta. Restano vuote finché non le scrive un modulo che lo chiede.
ALTER TABLE public.contatti ADD COLUMN IF NOT EXISTS marketing_consenso_il timestamptz;
ALTER TABLE public.contatti ADD COLUMN IF NOT EXISTS marketing_consenso_testo text;
ALTER TABLE public.contatti ADD COLUMN IF NOT EXISTS marketing_consenso_fonte text;

-- ── 4. Il registro ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contatti_attivita (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id   uuid NOT NULL REFERENCES public.aziende(id)  ON DELETE CASCADE,
  contatto_id  uuid NOT NULL REFERENCES public.contatti(id) ON DELETE CASCADE,
  -- Da quale porta è passata. Catalogo chiuso e tecnico: come si chiama a
  -- schermo lo decide il pannello, e il nome della cosa vera sta in `titolo`.
  tipo         text NOT NULL CHECK (tipo IN (
                 'evento', 'lista_attesa', 'prenotazione', 'ordine', 'modulo',
                 'richiesta', 'newsletter', 'whatsapp', 'preventivo', 'recensione',
                 'manuale', 'import', 'altro')),
  -- Il nome di ciò a cui si riferisce, come l'ha scritto il cliente: il titolo
  -- dell'evento, il nome del modulo, della risorsa, dell'offerta.
  titolo       text CHECK (titolo IS NULL OR char_length(titolo) <= 200),
  -- L'oggetto a cui si riferisce (l'evento, il modulo, la risorsa): è quello
  -- su cui si costruisce una lista. Senza chiave esterna perché indica tabelle
  -- diverse; se l'oggetto viene cancellato la riga resta, con il suo titolo.
  origine_id   uuid,
  -- La riga che l'ha generata (la prenotazione, l'invio del modulo, il
  -- messaggio). Testo e non uuid: alcuni identificativi non lo sono. Serve a
  -- non registrare due volte la stessa cosa.
  riferimento  text CHECK (riferimento IS NULL OR char_length(riferimento) <= 200),
  entity_id    uuid,
  -- Numeri e fatti, mai dati di persone: { "posti": 2 }.
  dettaglio    jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(dettaglio) = 'object'),
  avvenuta_il  timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- La stessa cosa non si registra due volte: chi ricostruisce la storia o
-- riceve due volte lo stesso webhook non raddoppia i conteggi.
CREATE UNIQUE INDEX IF NOT EXISTS contatti_attivita_una_volta_idx
  ON public.contatti_attivita (contatto_id, tipo, riferimento) WHERE riferimento IS NOT NULL;
CREATE INDEX IF NOT EXISTS contatti_attivita_contatto_idx
  ON public.contatti_attivita (contatto_id, avvenuta_il DESC);
-- «Tutti quelli di questo evento / modulo / risorsa».
CREATE INDEX IF NOT EXISTS contatti_attivita_origine_idx
  ON public.contatti_attivita (azienda_id, tipo, origine_id);

-- Si legge e si scrive solo dalle route, con la chiave di servizio. Nessuna
-- policy: chi bussa al database senza passare da noi non ne vede una riga.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contatti_attivita TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contatti_attivita TO service_role;
ALTER TABLE public.contatti_attivita ENABLE ROW LEVEL SECURITY;

-- ── 5. Il riepilogo si tiene allineato da solo ──────────────────────────────
-- Sta nel database e non nel codice perché deve valere per chiunque scriva nel
-- registro: una route, uno script di ricostruzione, una correzione a mano.
-- Ricalcola il riepilogo di UN contatto, contando le sue righe. Se il contatto
-- non c'è più (si sta cancellando, e il registro se ne va con lui) non fa niente.
CREATE OR REPLACE FUNCTION public.contatto_riepiloga(chi uuid)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  quante    integer;
  u_il      timestamptz;
  u_tipo    text;
  u_titolo  text;
BEGIN
  SELECT count(*) INTO quante FROM public.contatti_attivita WHERE contatto_id = chi;
  -- Senza righe le tre variabili restano NULL, e i campi tornano vuoti: è giusto così.
  SELECT avvenuta_il, tipo, titolo INTO u_il, u_tipo, u_titolo FROM public.contatti_attivita
    WHERE contatto_id = chi ORDER BY avvenuta_il DESC, created_at DESC LIMIT 1;
  UPDATE public.contatti SET
    attivita_numero        = quante,
    ultima_attivita_il     = u_il,
    ultima_attivita_tipo   = u_tipo,
    ultima_attivita_titolo = u_titolo
  WHERE id = chi;
END $$;

-- ⚠️ Una funzione nello schema pubblico è chiamabile da chiunque attraverso
-- l'API del database, anche senza login. Questa ricalcola e basta, ma non c'è
-- motivo di lasciarla aperta: la usa solo chi scrive nel registro.
REVOKE ALL ON FUNCTION public.contatto_riepiloga(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.contatto_riepiloga(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.contatti_attivita_riepiloga()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- I rami sono separati apposta: NEW non esiste in una cancellazione e OLD non
  -- esiste in un inserimento, e non vanno nemmeno nominati dove non ci sono.
  IF TG_OP = 'INSERT' THEN
    PERFORM public.contatto_riepiloga(NEW.contatto_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.contatto_riepiloga(OLD.contatto_id);
  ELSE
    PERFORM public.contatto_riepiloga(NEW.contatto_id);
    IF OLD.contatto_id IS DISTINCT FROM NEW.contatto_id THEN
      PERFORM public.contatto_riepiloga(OLD.contatto_id);
    END IF;
  END IF;
  RETURN NULL;
END $$;

REVOKE ALL ON FUNCTION public.contatti_attivita_riepiloga() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_contatti_attivita_riepiloga ON public.contatti_attivita;
CREATE TRIGGER trg_contatti_attivita_riepiloga
  AFTER INSERT OR UPDATE OR DELETE ON public.contatti_attivita
  FOR EACH ROW EXECUTE FUNCTION public.contatti_attivita_riepiloga();

COMMIT;
