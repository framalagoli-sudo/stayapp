-- Quanto costa l'AI, azienda per azienda, e un tetto che la fermi.
--
-- ⛔ Il 15/09/2026, con le credenziali già consegnate a più clienti, si è
-- scoperto che delle 13 chiamate all'AI della piattaforma solo UNA (il chatbot
-- pubblico) aveva un limite vero. Quattro avevano un «limite» tenuto in memoria
-- del server (`new Map()` in lib/ai-helpers.js), che su Vercel riparte da zero a
-- ogni istanza: sembrava una protezione e non proteggeva niente. Le altre otto
-- — piano editoriale, post, strategia, sito da documento, traduzioni — non ne
-- avevano nessuno. E nessuna registrava quanto spendeva.
--
-- Da qui: ogni chiamata all'AI passa da un punto solo (`lib/ai-consumi.js`), che
-- prima controlla il tetto mensile dell'azienda e dopo scrive qui quanto è
-- costata davvero, leggendo i token dalla risposta di Anthropic.

CREATE TABLE IF NOT EXISTS public.ai_consumi (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- NULL quando la chiamata non appartiene a un'azienda (es. una traduzione di
  -- una pagina della piattaforma): si conta lo stesso, per sapere il totale.
  azienda_id     uuid REFERENCES public.aziende(id) ON DELETE CASCADE,
  funzione       text NOT NULL,              -- es. 'content-studio/caption', 'chatbot', 'traduzione'
  modello        text NOT NULL,
  token_input    integer NOT NULL DEFAULT 0,
  token_output   integer NOT NULL DEFAULT 0,
  -- Calcolato con il listino in lib/ai-consumi.js al momento della chiamata:
  -- se il listino cambia, le righe vecchie restano con il costo di allora.
  costo_usd      numeric(12,6) NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- La domanda che si fa a ogni chiamata è «quanto ha speso questa azienda questo
-- mese?»: l'indice serve esattamente a quella.
CREATE INDEX IF NOT EXISTS ai_consumi_azienda_mese_idx ON public.ai_consumi (azienda_id, created_at DESC);

-- Tetto su misura per una singola azienda. NULL = il tetto predefinito della
-- piattaforma (costante in lib/ai-consumi.js). Lo cambia solo il super_admin.
ALTER TABLE public.aziende ADD COLUMN IF NOT EXISTS ai_budget_mensile_usd numeric(10,2);

-- Solo il server scrive e legge i consumi: nessun accesso dal browser né senza
-- sessione. Il pannello li mostra passando da una route che controlla chi chiede.
ALTER TABLE public.ai_consumi ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.ai_consumi TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.ai_consumi_id_seq TO service_role;

COMMENT ON TABLE public.ai_consumi IS
  'Una riga per ogni chiamata all''AI: chi, cosa, quanti token, quanto è costata. Base del tetto mensile per azienda.';
