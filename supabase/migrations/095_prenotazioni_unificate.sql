-- Un motore solo per creare, un motore solo per prenotare.
--
-- Deciso con Francesco il 28/08/2026 dopo aver contato dove finiscono le
-- prenotazioni: **cinque posti diversi**, e due voci di menu chiamate entrambe
-- «Prenotazioni». Le escursioni e le attività si distinguevano dalle richieste
-- di servizio leggendo l'inizio del testo del messaggio.
--
-- ⚠️ **Gli eventi restano fuori**, per scelta e con una ragione precisa:
-- catalogo → offerte → shop sono consequenziali, l'evento no. Non è una cosa
-- che possiedi e che poi metti in offerta o in vendita: è un fatto che accade.
-- `eventi` ed `event_bookings` non si toccano.
--
-- Nessun dato vero da migrare: le prenotazioni esistenti sono tutte di prova
-- (2 risorse + 6 dentro `requests`). È la finestra buona.

-- ── 1. Le offerte assorbono le risorse prenotabili ──────────────────────────
--
-- Confrontando i campi, a `offerte` mancavano **tre** cose delle `risorse`:
-- quanto prima si deve prenotare, entro quando si cancella, e se la conferma è
-- automatica. Tutto il resto c'era già (`modalita`→`modo`, `blocchi`→`chiusure`,
-- disponibilità, quantità, coperti, durata). E `visibile_minisito` non serve:
-- `pubblicata` fa già quel lavoro.
ALTER TABLE public.offerte
  ADD COLUMN IF NOT EXISTS anticipo_ore      integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS cancellazione_ore integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS conferma_auto     boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.offerte.anticipo_ore IS
  'Quanto prima si deve prenotare. Serve a non ricevere una prenotazione per fra dieci minuti.';
COMMENT ON COLUMN public.offerte.cancellazione_ore IS
  'Entro quante ore prima il cliente può disdire da solo.';

-- ── 2. Le prenotazioni diventano una sola ───────────────────────────────────
--
-- `prenotazioni` era già la più completa delle tre (27 colonne): le mancava il
-- riferimento a **cosa** è stato preso, e la prova del consenso — che oggi ce
-- l'hanno solo gli eventi e le richieste.
ALTER TABLE public.prenotazioni
  ADD COLUMN IF NOT EXISTS offerta_id           uuid REFERENCES public.offerte(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS messaggio            text,
  ADD COLUMN IF NOT EXISTS privacy_accettata    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS privacy_accettata_il timestamptz,
  ADD COLUMN IF NOT EXISTS privacy_testo        text;

-- `ON DELETE SET NULL` e non `CASCADE`: cancellando un'offerta le prenotazioni
-- restano. Dietro possono esserci incassi e persone che si presentano, e non
-- devono sparire perché qualcuno ha fatto pulizia nel catalogo.

-- ⚠️ `risorsa_id` era obbligatorio: una prenotazione nata da un'offerta non ha
-- una risorsa, e senza questo il salvataggio fallisce con un errore del
-- database — quello che nessuno capisce leggendo.
ALTER TABLE public.prenotazioni ALTER COLUMN risorsa_id DROP NOT NULL;

-- Una prenotazione deve pur riferirsi a qualcosa: o a un'offerta o a una
-- risorsa. Il vincolo lo dice invece di lasciarlo alla buona volontà del codice.
ALTER TABLE public.prenotazioni
  DROP CONSTRAINT IF EXISTS prenotazioni_riferimento;
ALTER TABLE public.prenotazioni
  ADD CONSTRAINT prenotazioni_riferimento
  CHECK (offerta_id IS NOT NULL OR risorsa_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_prenotazioni_offerta ON public.prenotazioni (offerta_id);

GRANT SELECT (offerta_id, messaggio, privacy_accettata, privacy_accettata_il, privacy_testo)
  ON public.prenotazioni TO authenticated;

COMMENT ON COLUMN public.prenotazioni.offerta_id IS
  'Che cosa è stato preso. Null solo per le prenotazioni nate prima, che puntano a una risorsa.';
COMMENT ON COLUMN public.prenotazioni.messaggio IS
  'Quello che ha scritto chi prenota. Prima viveva dentro `requests.message`, insieme al tipo, in una stringa da interpretare.';

-- regola-ok: nessuna tabella nuova, colonne su tabelle che hanno gia permessi e RLS
