-- 142 — Una newsletter può ESCLUDERE una o più liste di contatti.
--
-- Garage 22, 28/10/2026: una promo a tutti gli iscritti TRANNE chi ha già
-- prenotato la serata di domani, a cui darebbe fastidio. Con la sola `lista`
-- (migration 131) si sceglieva a chi scrivere, non a chi non scrivere.
--
-- `escludi` è un elenco di liste nella stessa forma di `lista`:
--   [{ "chiave": "evento|<id>", "titolo": "Chi ha prenotato «…»" }, …]
-- Come per `lista`, si salva la CHIAVE e non l'elenco delle persone: chi c'è
-- dentro si ricalcola al momento dell'invio, così chi prenota la serata fra la
-- bozza e la partenza viene escluso lo stesso.
-- Vuoto o NULL = nessuna esclusione, come oggi.
--
-- ⚠️ Se una lista esclusa non esiste più, l'invio si FERMA (lib/newsletter-
-- destinatari.js): partire senza l'esclusione scriverebbe proprio a chi non
-- doveva riceverla.
--
-- Il vincolo controlla la forma esterna (un elenco, al massimo 10 liste); le
-- singole voci le ripulisce la route (`escludiValida`), come per `lista`.
--
-- Nessuna tabella nuova: permessi e RLS di `newsletters` restano quelli che
-- sono (la tabella non è letta dal ruolo pubblico). Nessun dato esistente cambia.

BEGIN;

ALTER TABLE public.newsletters ADD COLUMN IF NOT EXISTS escludi jsonb
  CONSTRAINT newsletters_escludi_check CHECK (escludi IS NULL OR (
    jsonb_typeof(escludi) = 'array'
    AND jsonb_array_length(escludi) <= 10
  ));

COMMIT;
