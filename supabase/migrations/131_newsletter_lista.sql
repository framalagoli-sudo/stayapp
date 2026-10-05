-- 131 — Una newsletter si può mandare a una lista di contatti.
--
-- Oggi una newsletter sceglie i destinatari per TAG (`tag_filter`, migration
-- 059): «manda a chi ha il tag UOMA Stand-up comedy show…». È il motivo per cui
-- ogni prenotazione scrive ancora nei tag il titolo intero dell'evento — il
-- rumore che dalla pagina Contatti abbiamo tolto dalla vista ma non dai dati.
--
-- Dal 04/10/2026 i contatti hanno le LISTE, calcolate da quello che le persone
-- hanno fatto (`lib/contatti-liste.js`): «chi ha prenotato quella serata»,
-- «tornati più volte», un'etichetta scritta a mano. Qui la newsletter impara a
-- puntare a una di quelle.
--
-- `lista` contiene la CHIAVE della lista e il titolo com'era quando è stata
-- scelta: { "chiave": "evento|<id>", "titolo": "Chi ha prenotato «Luca Zesi»" }.
-- NON contiene l'elenco delle persone: chi c'è dentro si ricalcola al momento
-- dell'invio, così chi ha prenotato dopo che la bozza è stata scritta la riceve.
-- Vuoto = come oggi (tutti gli iscritti, o il filtro per tag).
--
-- ⚠️ La lista dice A CHI, non CHI PUÒ riceverla: l'invio continua a partire solo
-- verso chi è iscritto alla newsletter e ha un'email valida.
--
-- Nessuna tabella nuova: i permessi e la RLS di `newsletters` restano quelli che
-- sono. Nessun dato esistente viene modificato.

BEGIN;

ALTER TABLE public.newsletters ADD COLUMN IF NOT EXISTS lista jsonb
  CHECK (lista IS NULL OR (
    jsonb_typeof(lista) = 'object'
    AND jsonb_typeof(lista -> 'chiave') = 'string'
    AND char_length(lista ->> 'chiave') BETWEEN 1 AND 300
  ));

COMMIT;
