-- 134 — Quanto è stato chiesto online per una prenotazione.
--
-- Una risorsa può chiedere un acconto (30% prenotando, il resto dopo). La riga
-- conservava solo il totale: «Pagato» accanto a «€120» si leggeva come tutto
-- saldato quando erano arrivati 36 euro, e la lista degli incassi contava 120.
-- Ricalcolare la quota dalla percentuale della risorsa non basta: il titolare
-- la può cambiare domani, e la prenotazione di ieri racconterebbe una cifra che
-- nessuno ha mai pagato.
--
-- Qui si scrive la cifra portata alla cassa, nel momento in cui la cassa si
-- apre. NULL = per questa prenotazione non è stato chiesto niente online.
--
-- Nessuna colonna pubblica: `prenotazioni` non è leggibile senza sessione.
-- Nessun dato da sistemare: all'08/10/2026 nessuna prenotazione ha mai aperto
-- una cassa (7 righe, tutte «non_richiesto»).

BEGIN;

ALTER TABLE public.prenotazioni ADD COLUMN IF NOT EXISTS importo_online numeric(10,2);

ALTER TABLE public.prenotazioni DROP CONSTRAINT IF EXISTS prenotazioni_importo_online_check;
ALTER TABLE public.prenotazioni ADD CONSTRAINT prenotazioni_importo_online_check
  CHECK (importo_online IS NULL OR importo_online >= 0);

COMMIT;
