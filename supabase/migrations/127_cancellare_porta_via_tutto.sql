-- 127 — Cancellare un'azienda, o una sua entità, porta via tutto.
--
-- Misurato in produzione il 24/09/2026 con tests/probe-cancella-azienda.mjs:
--  · un'azienda con anche una sola prenotazione NON si poteva cancellare
--    (prenotazioni.azienda_id senza ON DELETE → violazione di chiave esterna);
--  · quando la cancellazione riusciva restavano le pagine del sito, le visite,
--    le vetrine e le righe delle tabelle storiche (properties / ristoranti /
--    attivita: ON DELETE SET NULL — lì dentro c'erano anche le credenziali WiFi);
--  · requests e messages avevano property_id obbligatorio ma ON DELETE SET NULL:
--    le due regole si contraddicono, e un'entità con una richiesta non si
--    poteva cancellare.
-- Gli utenti, i file e le traduzioni li toglie il codice (lib/cancellazione.js):
-- il database non li raggiunge.
--
-- Nessuna tabella nuova, nessuna colonna nuova: niente GRANT né RLS da dichiarare.
-- ⚠️ entity_translations NON riceve una chiave esterna: il suo entity_id indica
-- entità, pagine, eventi, articoli e form. Legarla a `entita` cancellerebbe le
-- traduzioni vive di pagine ed eventi.

BEGIN;

-- ── 1. I residui di chi è già stato cancellato ──────────────────────────────
-- Verificati uno per uno il 24/09: nessuno appartiene a un'entità viva, né
-- nuova né storica. Due pagine di maggio di strutture cancellate («Matteo»,
-- «Prova»), 36 visite di entità cancellate, una vetrina «ZZ Viaggi» lasciata
-- da una sonda il 27/08. Vanno tolti prima: una chiave esterna non si crea
-- finché ci sono righe che la violano.
DELETE FROM public.pagine           WHERE entity_id NOT IN (SELECT id FROM public.entita);
DELETE FROM public.page_views       WHERE entity_id NOT IN (SELECT id FROM public.entita);
DELETE FROM public.vetrina_elementi WHERE entity_id NOT IN (SELECT id FROM public.entita);
DELETE FROM public.vetrine          WHERE entity_id NOT IN (SELECT id FROM public.entita);
DELETE FROM public.site_snapshots   WHERE entity_id IS NOT NULL AND entity_id NOT IN (SELECT id FROM public.entita);

-- ── 2. Le chiavi esterne che si cancellano insieme ──────────────────────────
-- Toglie la chiave esterna su (tabella, colonna), qualunque nome abbia — i nomi
-- sono nati in migration diverse e non sono affidabili — e la rimette con
-- ON DELETE CASCADE verso la tabella indicata.
CREATE OR REPLACE FUNCTION pg_temp.in_cascata(tabella text, colonna text, riferita text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  vincolo text;
BEGIN
  FOR vincolo IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.contype = 'f'
      AND c.conrelid = format('public.%I', tabella)::regclass
      AND a.attname = colonna
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', tabella, vincolo);
  END LOOP;
  EXECUTE format(
    'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(id) ON DELETE CASCADE',
    tabella, tabella || '_' || colonna || '_fkey', colonna, riferita);
END $$;

-- Se ne vanno con l'entità: il contenuto che senza di lei non ha un posto.
SELECT pg_temp.in_cascata('pagine',           'entity_id',   'entita');
SELECT pg_temp.in_cascata('page_views',       'entity_id',   'entita');
SELECT pg_temp.in_cascata('vetrine',          'entity_id',   'entita');
SELECT pg_temp.in_cascata('vetrina_elementi', 'entity_id',   'entita');
SELECT pg_temp.in_cascata('site_snapshots',   'entity_id',   'entita');
SELECT pg_temp.in_cascata('requests',         'property_id', 'entita');
SELECT pg_temp.in_cascata('messages',         'property_id', 'entita');

-- Se ne vanno con l'azienda.
SELECT pg_temp.in_cascata('prenotazioni', 'azienda_id', 'aziende');
SELECT pg_temp.in_cascata('properties',   'azienda_id', 'aziende');
SELECT pg_temp.in_cascata('ristoranti',   'azienda_id', 'aziende');
SELECT pg_temp.in_cascata('attivita',     'azienda_id', 'aziende');

-- ⚠️ profiles.azienda_id resta ON DELETE SET NULL, di proposito: l'utente vive
-- in auth.users, che il database non può cancellare da qui. Se la riga del
-- profilo sparisse da sola, resterebbe un account capace di fare login e senza
-- nessun profilo. Gli account li toglie il codice, PRIMA dell'azienda.

COMMIT;

-- Verifica, da lanciare dopo: deve restituire 11 righe, tutte con «CASCADE».
-- SELECT conrelid::regclass AS tabella, conname,
--        CASE confdeltype WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' ELSE confdeltype::text END AS alla_cancellazione
-- FROM pg_constraint
-- WHERE contype = 'f' AND conname IN (
--   'pagine_entity_id_fkey','page_views_entity_id_fkey','vetrine_entity_id_fkey',
--   'vetrina_elementi_entity_id_fkey','site_snapshots_entity_id_fkey',
--   'requests_property_id_fkey','messages_property_id_fkey',
--   'prenotazioni_azienda_id_fkey','properties_azienda_id_fkey',
--   'ristoranti_azienda_id_fkey','attivita_azienda_id_fkey')
-- ORDER BY 1;
