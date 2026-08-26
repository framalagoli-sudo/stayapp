-- PASSO 2 — Una sola tabella per tutto quello che un cliente offre.
--
-- Perché. Oggi «qualcuno vuole prenotare qualcosa» ha cinque strade diverse:
-- eventi (tabella propria), risorse del booking (tabella propria), attività ed
-- escursioni (campi jsonb dentro l'entità), offerte (blocco del sito). Ogni
-- strada finisce in un posto diverso e sa fare cose diverse — tre su cinque non
-- contano nemmeno i posti. Non è colpa di una scelta sbagliata: ogni pezzo è
-- nato in un momento diverso, ragionevole da solo. Insieme fanno cinque.
--
-- ⚠️ QUESTO PASSO NON CAMBIA NIENTE. La tabella nasce **vuota** e nessuno la
-- usa ancora: eventi e risorse restano intatti e il prodotto continua a girare
-- esattamente come prima. Serve ad avere la destinazione pronta e verificabile
-- prima dei passi delicati. Stesso metodo dell'unificazione delle entità.
--
-- L'ordine della migrazione, deciso in partenza e non negoziabile:
--   1. questa tabella, vuota                          ← siamo qui
--   2. dentro ci si migrano le cose a ZERO utilizzi   (risorse, attività, escursioni)
--   3. gli eventi per ULTIMI, che sono l'unica cosa usata davvero (5 prenotazioni)
-- Se al passo 3 qualcosa non torna, ci si ferma e gli eventi restano dove sono.

CREATE TABLE IF NOT EXISTS public.offerte (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id   uuid NOT NULL REFERENCES public.aziende(id) ON DELETE CASCADE,
  -- Un'offerta appartiene a un'entità; se manca è dell'azienda e vale per tutte
  -- (è il caso degli eventi aziendali, che oggi funzionano già così).
  entity_id    uuid REFERENCES public.entita(id) ON DELETE CASCADE,

  -- ── Le due scelte che definiscono tutto ─────────────────────────────────
  --
  -- `modo` = QUANDO si fa. `impegno` = COSA SUCCEDE quando qualcuno clicca.
  -- Sono indipendenti: una cena a coperti che si acquista, un'escursione a data
  -- fissa che si paga sul posto, una consulenza a calendario su richiesta.
  -- Dodici combinazioni da due tendine, e nessun «tipo» che faccia da recinto —
  -- è la stessa regola delle entità, dove il tipo sceglie il preset e basta.
  modo    text NOT NULL DEFAULT 'richiesta',
  impegno text NOT NULL DEFAULT 'chiedi',

  -- ── Cosa si vede ─────────────────────────────────────────────────────────
  titolo        text NOT NULL,
  descrizione   text,
  slug          text,
  cover_url     text,
  formato_cover text,          -- quadrato | verticale | orizzontale | storia
  cover_focal   text,          -- «50% 30%»: quale parte resta visibile nel ritaglio
  colore        text NOT NULL DEFAULT '#00b5b5',
  luogo         text,

  -- ── Il prezzo, e come si legge ───────────────────────────────────────────
  prezzo               numeric NOT NULL DEFAULT 0,
  valuta               text    NOT NULL DEFAULT 'EUR',
  prezzo_testo         text,                       -- «Alla carta», al posto della cifra
  mostra_prezzo        boolean NOT NULL DEFAULT true,   -- nella scheda dell'elenco
  mostra_prezzo_pagina boolean NOT NULL DEFAULT true,   -- nella pagina aperta
  pacchetti            jsonb   NOT NULL DEFAULT '[]'::jsonb,

  -- ── Il pulsante ──────────────────────────────────────────────────────────
  cta_label      text,
  cta_condizioni text,

  -- ── modo = 'data_fissa' — l'evento ───────────────────────────────────────
  data_inizio timestamptz,
  data_fine   timestamptz,

  -- ── modo = 'calendario' — slot con durata ────────────────────────────────
  durata_minuti int NOT NULL DEFAULT 60,
  -- Quante copie identiche esistono in parallelo: tre campi da tennis, cinque
  -- tavoli uguali. Non è la capienza di una: è quante ce ne sono.
  quantita      int NOT NULL DEFAULT 1,

  -- ── modo = 'coperti' — capienza dentro una fascia ────────────────────────
  max_coperti int,

  -- ── Posti, per i modi che li contano ─────────────────────────────────────
  -- `posti_totali` nullo = illimitato. `posti_occupati` lo tiene il sistema:
  -- ⚠️ non si scrive mai a mano, e per «acquista» si muove solo a pagamento
  -- accertato (invariante 11 in SECURITY.md).
  posti_totali   int,
  posti_occupati int NOT NULL DEFAULT 0,

  -- Quando e come si può prenotare. Stessa forma di `risorse.disponibilita`,
  -- così il motore già scritto continua a funzionare senza riscritture.
  disponibilita jsonb NOT NULL DEFAULT '{}'::jsonb,
  chiusure      jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- ── Cosa succede quando arriva una richiesta ─────────────────────────────
  avvisa_titolare  boolean NOT NULL DEFAULT true,
  conferma_ospite  boolean NOT NULL DEFAULT false,

  attiva      boolean NOT NULL DEFAULT true,
  pubblicata  boolean NOT NULL DEFAULT false,
  ordine      int     NOT NULL DEFAULT 0,

  -- Da dove viene, durante la migrazione: serve a riconciliare e a tornare
  -- indietro. Non esce mai nelle risposte pubbliche.
  origine      text,
  origine_id   uuid,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- I due valori che definiscono il comportamento non si inventano: se una route
-- distratta scrivesse `modo = 'boh'`, il motore non saprebbe cosa fare e la
-- pagina pubblica mostrerebbe qualcosa a caso. Il vincolo sta nel database,
-- dove vale anche per chi scrivesse saltando le route.
ALTER TABLE public.offerte DROP CONSTRAINT IF EXISTS offerte_modo_ammesso;
ALTER TABLE public.offerte ADD CONSTRAINT offerte_modo_ammesso
  CHECK (modo IN ('data_fissa', 'calendario', 'coperti', 'richiesta'));

ALTER TABLE public.offerte DROP CONSTRAINT IF EXISTS offerte_impegno_ammesso;
ALTER TABLE public.offerte ADD CONSTRAINT offerte_impegno_ammesso
  CHECK (impegno IN ('chiedi', 'prenota', 'acquista'));

ALTER TABLE public.offerte DROP CONSTRAINT IF EXISTS offerte_formato_ammesso;
ALTER TABLE public.offerte ADD CONSTRAINT offerte_formato_ammesso
  CHECK (formato_cover IS NULL OR formato_cover IN ('quadrato','verticale','orizzontale','storia'));

ALTER TABLE public.offerte DROP CONSTRAINT IF EXISTS offerte_focal_valido;
ALTER TABLE public.offerte ADD CONSTRAINT offerte_focal_valido
  CHECK (cover_focal IS NULL OR cover_focal ~ '^[0-9]{1,3}% [0-9]{1,3}%$');

ALTER TABLE public.offerte DROP CONSTRAINT IF EXISTS offerte_testi_brevi;
ALTER TABLE public.offerte ADD CONSTRAINT offerte_testi_brevi
  CHECK ((cta_label IS NULL OR char_length(cta_label) <= 60)
     AND (cta_condizioni IS NULL OR char_length(cta_condizioni) <= 600)
     AND (prezzo_testo IS NULL OR char_length(prezzo_testo) <= 40));

-- I posti occupati non possono superare i totali né andare sotto zero: è la
-- difesa finale contro un errore di conteggio, sotto quella applicativa.
ALTER TABLE public.offerte DROP CONSTRAINT IF EXISTS offerte_posti_coerenti;
ALTER TABLE public.offerte ADD CONSTRAINT offerte_posti_coerenti
  CHECK (posti_occupati >= 0 AND (posti_totali IS NULL OR posti_occupati <= posti_totali));

-- Lo slug è unico dentro l'entità: due offerte della stessa attività non
-- possono avere lo stesso indirizzo pubblico.
CREATE UNIQUE INDEX IF NOT EXISTS offerte_slug_per_entita
  ON public.offerte (entity_id, slug) WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS offerte_azienda_idx ON public.offerte (azienda_id);
CREATE INDEX IF NOT EXISTS offerte_entita_idx  ON public.offerte (entity_id);
CREATE INDEX IF NOT EXISTS offerte_pubbliche_idx
  ON public.offerte (entity_id, pubblicata, attiva) WHERE pubblicata AND attiva;

-- ── Permessi ─────────────────────────────────────────────────────────────────
-- Dal 25/08 le colonne si concedono una per una: con un GRANT su tutta la
-- tabella, una colonna aggiunta domani diventerebbe pubblica da sola. Qui il
-- ruolo pubblico vede solo ciò che serve a mostrare l'offerta su un sito.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offerte TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offerte TO authenticated;

GRANT SELECT (
  id, azienda_id, entity_id, modo, impegno,
  titolo, descrizione, slug, cover_url, formato_cover, cover_focal, colore, luogo,
  prezzo, valuta, prezzo_testo, mostra_prezzo, mostra_prezzo_pagina, pacchetti,
  cta_label, cta_condizioni,
  data_inizio, data_fine, durata_minuti, quantita, max_coperti,
  posti_totali, posti_occupati, disponibilita, chiusure,
  attiva, pubblicata, ordine, created_at, updated_at
) ON public.offerte TO anon;
-- Fuori di proposito: `origine`/`origine_id` (residui della migrazione) e i due
-- interruttori delle notifiche, che riguardano il cliente e non chi guarda.

ALTER TABLE public.offerte ENABLE ROW LEVEL SECURITY;

-- Il pubblico vede solo ciò che il cliente ha pubblicato e non ha spento.
DROP POLICY IF EXISTS offerte_pubbliche_in_lettura ON public.offerte;
CREATE POLICY offerte_pubbliche_in_lettura ON public.offerte
  FOR SELECT TO anon
  USING (pubblicata AND attiva);

-- Chi ha una sessione vede le offerte della propria azienda, e basta: la
-- separazione fra clienti non dipende solo dai controlli nelle route.
DROP POLICY IF EXISTS offerte_della_propria_azienda ON public.offerte;
CREATE POLICY offerte_della_propria_azienda ON public.offerte
  FOR SELECT TO authenticated
  USING (azienda_id IN (SELECT azienda_id FROM public.profiles WHERE id = auth.uid()));

COMMENT ON TABLE public.offerte IS
  'Tutto quello che un cliente offre e che qualcuno può prenotare o comprare. `modo` dice quando si fa, `impegno` cosa succede al clic. Sostituisce eventi, risorse, activities ed excursions.';
