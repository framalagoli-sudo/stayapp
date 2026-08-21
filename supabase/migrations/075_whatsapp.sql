-- Modulo WhatsApp: collegamento del numero del cliente, template, campagne e
-- registro dei messaggi. Piano e decisioni in WHATSAPP.md.
--
-- Impianto: il WhatsApp Business Account è del CLIENTE (Embedded Signup), noi
-- creiamo sul suo account i template del nostro catalogo. Ogni tabella è scopata
-- per azienda_id, come tutto il resto della piattaforma.

-- ── Il numero collegato ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.whatsapp_account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id uuid REFERENCES public.aziende(id) ON DELETE CASCADE NOT NULL UNIQUE,
  waba_id text,
  phone_number_id text,
  numero_visualizzato text,
  stato text DEFAULT 'da_collegare' CHECK (stato IN ('da_collegare','in_verifica','attivo','sospeso')),
  -- Il token vive cifrato e non esce MAI verso il browser: dà accesso completo
  -- all'account WhatsApp del cliente.
  access_token_cifrato text,
  quality_rating text,
  limite_messaggi text,
  collegato_il timestamptz,
  ultima_verifica timestamptz,
  dettaglio jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── I template del nostro catalogo, copiati sull'account del cliente ──────────
CREATE TABLE IF NOT EXISTS public.whatsapp_template (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id uuid REFERENCES public.aziende(id) ON DELETE CASCADE NOT NULL,
  catalogo_key text NOT NULL,
  catalogo_versione integer DEFAULT 1,
  lingua text DEFAULT 'it',
  template_meta_id text,
  nome_meta text,
  stato text DEFAULT 'in_attesa' CHECK (stato IN ('in_attesa','approvato','rifiutato','disabilitato')),
  motivo_rifiuto text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Una sola copia per versione del catalogo, per azienda e lingua.
  UNIQUE (azienda_id, catalogo_key, catalogo_versione, lingua)
);

-- ── Le campagne: stesso modello della newsletter ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.whatsapp_campagna (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id uuid REFERENCES public.aziende(id) ON DELETE CASCADE NOT NULL,
  entity_tipo text,
  entity_id uuid,
  nome text NOT NULL,
  catalogo_key text NOT NULL,
  variabili jsonb DEFAULT '{}'::jsonb,
  tag_filter text[],
  stato text DEFAULT 'bozza' CHECK (stato IN ('bozza','programmata','in_corso','completata','annullata','errore')),
  programmata_per timestamptz,
  destinatari_totali integer DEFAULT 0,
  inviati integer DEFAULT 0,
  consegnati integer DEFAULT 0,
  letti integer DEFAULT 0,
  falliti integer DEFAULT 0,
  -- Il costo si stima PRIMA dell'invio e si mostra al cliente: mai una sorpresa
  -- in fattura (vedi WHATSAPP.md §11).
  costo_stimato numeric(10,2),
  errore text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── Un record per destinatario: il registro che serve quando qualcosa va storto ─
CREATE TABLE IF NOT EXISTS public.whatsapp_messaggio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id uuid REFERENCES public.aziende(id) ON DELETE CASCADE NOT NULL,
  campagna_id uuid REFERENCES public.whatsapp_campagna(id) ON DELETE CASCADE,
  contatto_id uuid REFERENCES public.contatti(id) ON DELETE SET NULL,
  telefono text NOT NULL,
  message_id_meta text,
  stato text DEFAULT 'in_coda' CHECK (stato IN ('in_coda','inviato','consegnato','letto','fallito')),
  errore text,
  inviato_il timestamptz,
  consegnato_il timestamptz,
  letto_il timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Il webhook di Meta arriva con l'id del messaggio: senza indice, ogni notifica
-- costerebbe una scansione completa.
CREATE INDEX IF NOT EXISTS whatsapp_messaggio_meta_idx ON public.whatsapp_messaggio (message_id_meta);
CREATE INDEX IF NOT EXISTS whatsapp_messaggio_campagna_idx ON public.whatsapp_messaggio (campagna_id, stato);
CREATE INDEX IF NOT EXISTS whatsapp_campagna_azienda_idx ON public.whatsapp_campagna (azienda_id, stato);
-- Le campagne programmate le pesca il cron: indice sulle sole in attesa.
CREATE INDEX IF NOT EXISTS whatsapp_campagna_programmate_idx
  ON public.whatsapp_campagna (programmata_per) WHERE stato = 'programmata';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_account TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_account TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_template TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_template TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_campagna TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_campagna TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_messaggio TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_messaggio TO service_role;

ALTER TABLE public.whatsapp_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_campagna ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messaggio ENABLE ROW LEVEL SECURITY;
