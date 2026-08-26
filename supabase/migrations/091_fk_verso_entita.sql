-- Le richieste degli ospiti puntavano ancora alla vecchia tabella delle strutture.
--
-- Misurato in produzione il 26/08: un POST /api/requests per un'entità che non
-- esiste in `properties` risponde **500**, «violates foreign key constraint
-- requests_property_id_fkey». Oggi sono 9 entità su 13 — tutti i ristoranti e
-- tutte le attività — più ogni entità creata da qui in avanti, perché le nuove
-- nascono solo in `entita`.
--
-- Il difetto era invisibile per due motivi che vale la pena ricordare:
--   1. l'unica entità con cui si prova di solito (`struttura-test`) è una delle
--      quattro rimaste in `properties`, quindi la prova andava sempre bene;
--   2. la migrazione a `entita` (079–081) ha spostato i **dati** e ha lasciato
--      indietro i **vincoli**. Un vincolo che punta a una tabella ferma non dà
--      alcun errore finché qualcuno non ci scrive dentro.
--
-- Le stesse tre colonne servivano anche ai join di PostgREST: `properties(name)`
-- e `properties(azienda_id)` tornavano vuoti per ristoranti e attività, quindi
-- le richieste comparivano senza nome e il titolare non riusciva a chiuderle.
-- Quel codice ora legge `entita` con una query sua e non dipende più da qui.
--
-- Verificato prima di eseguire: 16 righe in `requests`, 7 in `messages`, 1 in
-- `profiles` — tutti i `property_id` esistono già in `entita`, nessuno resta fuori.

-- Il nome del vincolo si chiede al catalogo, non si indovina: se il nome vero
-- fosse diverso da quello atteso, un DROP ... IF EXISTS non farebbe nulla in
-- silenzio e il vincolo rotto resterebbe al suo posto.
DO $$
DECLARE
  t text;
  c text;
BEGIN
  FOREACH t IN ARRAY ARRAY['requests', 'messages', 'profiles'] LOOP
    FOR c IN
      SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class     src ON src.oid = con.conrelid
        JOIN pg_class     tgt ON tgt.oid = con.confrelid
        JOIN pg_namespace ns  ON ns.oid  = src.relnamespace
       WHERE con.contype = 'f'
         AND ns.nspname  = 'public'
         AND src.relname = t
         AND tgt.relname IN ('properties', 'ristoranti', 'attivita')
    LOOP
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', t, c);
      RAISE NOTICE 'tolto il vincolo % su %', c, t;
    END LOOP;
  END LOOP;
END $$;

-- Le richieste di un'entità cancellata se ne vanno con lei (erano dati suoi).
ALTER TABLE public.requests
  ADD CONSTRAINT requests_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.entita(id) ON DELETE CASCADE;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.entita(id) ON DELETE CASCADE;

-- Una persona invece resta: perde l'assegnazione, non l'account.
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.entita(id) ON DELETE SET NULL;

-- regola-ok: nessuna tabella nuova, si spostano tre vincoli esistenti — permessi e RLS restano quelli che erano
