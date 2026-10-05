-- 132 — Il vincolo su `newsletters.lista` (migration 131) lasciava passare una
--       lista senza chiave.
--
-- Trovato verificando la 131 sul database: `{ "titolo": "senza chiave" }` veniva
-- accettato. Il vincolo diceva `jsonb_typeof(lista -> 'chiave') = 'string'`, ma
-- se la chiave non c'è quell'espressione vale NULL — e un CHECK che vale NULL
-- lascia passare. Il «non lo so» del database non è un «no».
--
-- Non è un buco aperto: la route tiene della lista solo chiave e titolo
-- (`listaValida`), e l'invio si ferma se la chiave non indica una lista vera.
-- Ma il terzo muro deve reggere da solo, per la route che domani lo dimentica.
--
-- Nessun dato da sistemare: al 05/10/2026 nessuna newsletter ha una lista senza chiave.

BEGIN;

ALTER TABLE public.newsletters DROP CONSTRAINT IF EXISTS newsletters_lista_check;
ALTER TABLE public.newsletters ADD CONSTRAINT newsletters_lista_check
  CHECK (lista IS NULL OR (
    jsonb_typeof(lista) = 'object'
    AND lista ? 'chiave'
    AND jsonb_typeof(lista -> 'chiave') = 'string'
    AND char_length(lista ->> 'chiave') BETWEEN 1 AND 300
  ));

COMMIT;
