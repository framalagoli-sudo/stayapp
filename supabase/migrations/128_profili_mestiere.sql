-- 128 — I profili di mestiere (STRATEGIA.md §6.1, fase F2).
--
-- Un profilo è il punto di partenza di un cliente nuovo: quali funzioni si
-- trova accese il primo giorno e con quale tipo nasce la sua prima entità.
-- Oggi il preset accende TUTTO per tutti (lib/funzioni.js, TUTTE_ACCESE) e le
-- ~20 funzioni di livello azienda non hanno interruttore: il cliente trova un
-- calderone di voci, la maggior parte mai usate.
--
-- In questa fase i profili si scrivono e si guardano soltanto (area super_admin
-- «Funzioni e profili»). NON si applicano a nessuno: l'applicazione alla
-- nascita è la fase F3, e cambierà cosa vede un cliente nuovo — si decide con
-- Francesco, non qui.
--
-- Le chiavi dentro `funzioni_*` sono quelle di lib/funzioni.js (FUNZIONI e
-- FUNZIONI_AZIENDA). La route le valida contro quel catalogo: una chiave che
-- non esiste non entra.

BEGIN;

CREATE TABLE IF NOT EXISTS public.profili_mestiere (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chiave           text NOT NULL UNIQUE CHECK (chiave ~ '^[a-z0-9_]{2,40}$'),
  nome             text NOT NULL CHECK (char_length(nome) BETWEEN 1 AND 60),
  descrizione      text NOT NULL DEFAULT '' CHECK (char_length(descrizione) <= 300),
  -- Il tipo tecnico della prima entità: decide solo l'indirizzo (/s /r /a).
  tipo_entita      text NOT NULL CHECK (tipo_entita IN ('struttura', 'ristorante', 'attivita')),
  funzioni_entita  jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(funzioni_entita) = 'object'),
  funzioni_azienda jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(funzioni_azienda) = 'object'),
  ordine           integer NOT NULL DEFAULT 0,
  -- Sale a ogni modifica: chi è nato da un profilo potrà sapere se quel profilo
  -- è cambiato dopo (fase F4, la proposta di aggiornamento).
  versione         integer NOT NULL DEFAULT 1,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Si legge e si scrive solo dalle route del super_admin, con la chiave di
-- servizio. Nessuna policy: un utente autenticato non ne vede neanche una riga.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profili_mestiere TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profili_mestiere TO service_role;
ALTER TABLE public.profili_mestiere ENABLE ROW LEVEL SECURITY;

-- ── I profili di partenza ───────────────────────────────────────────────────
-- Ricavati dai clienti veri e dall'uso misurato il 23–24/09 (pagina «Funzioni e
-- profili»). Sono proposte: si cambiano dall'editor. Le funzioni che nessuna
-- azienda ha mai usato (shop, loyalty, automazioni, WhatsApp, survey, Content
-- Studio) non sono accese in nessun profilo: restano attivabili a richiesta.
INSERT INTO public.profili_mestiere (chiave, nome, descrizione, tipo_entita, funzioni_entita, funzioni_azienda, ordine) VALUES
  ('locale_eventi', 'Locale con eventi',
   'Ristoranti, bar e locali che organizzano serate, cene a tema, concerti.',
   'ristorante',
   '{"galleria":true,"menu":true,"offerte":true}',
   '{"contatti":true,"eventi":true,"offerte":true,"recensioni":true,"newsletter":true,"form_builder":true,"analytics":true}',
   10),
  ('struttura_ricettiva', 'Struttura ricettiva',
   'Hotel, B&B, agriturismi: l''app del QR per gli ospiti, richieste e prenotazioni.',
   'struttura',
   '{"galleria":true,"servizi":true,"menu":true,"offerte":true}',
   '{"richieste":true,"chat":true,"prenotazioni":true,"booking":true,"contatti":true,"recensioni":true,"eventi":true,"offerte":true,"newsletter":true,"analytics":true}',
   20),
  ('scuola_corsi', 'Scuola e corsi',
   'Scuole, centri di formazione, corsi: iscrizioni, preventivi, open day.',
   'attivita',
   '{"galleria":true,"servizi":true,"offerte":true}',
   '{"contatti":true,"form_builder":true,"preventivi":true,"eventi":true,"offerte":true,"blog":true,"newsletter":true,"piano_editoriale":true,"analytics":true}',
   30),
  ('catalogo_noleggio', 'Catalogo e noleggio',
   'Chi mostra un catalogo (immobili, veicoli, viaggi) e noleggia o prenota a giornate.',
   'attivita',
   '{"galleria":true,"vetrine":true,"offerte":true}',
   '{"contatti":true,"prenotazioni":true,"booking":true,"form_builder":true,"preventivi":true,"recensioni":true,"analytics":true}',
   40),
  ('studio_professionale', 'Studio professionale',
   'Professionisti e studi: sito, contatti, preventivi, recensioni.',
   'attivita',
   '{"galleria":true,"servizi":true}',
   '{"contatti":true,"form_builder":true,"preventivi":true,"recensioni":true,"blog":true,"analytics":true}',
   50),
  ('da_zero', 'Parto da zero',
   'Solo il sito e i contatti: il resto si accende quando serve.',
   'attivita',
   '{}',
   '{"contatti":true,"analytics":true}',
   60)
ON CONFLICT (chiave) DO NOTHING;

COMMIT;

-- Verifica: SELECT chiave, nome, tipo_entita, versione FROM public.profili_mestiere ORDER BY ordine;
-- → 6 righe.
