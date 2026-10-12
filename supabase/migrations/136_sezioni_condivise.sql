-- 136 — Le sezioni condivise: un pezzo di pagina scritto una volta e usato su
--       più pagine dello stesso sito.
--
-- Fino a oggi l'unico modo di avere la stessa sezione su quattro pagine era
-- copiarla quattro volte: cambiare una parola voleva dire cambiarla quattro
-- volte (metodotvb, 21/09/2026: la stessa chiamata all'azione in 4 copie).
--
-- Una sezione condivisa è una riga qui: un nome e i suoi blocchi. Nella pagina
-- resta solo un blocco di tipo `sezione` che dice quale (`data.sezione_id`);
-- il contenuto lo mette il server quando legge la pagina (`lib/sezioni.js`).
--
-- Appartiene a UN'entità (un sito): la stessa chiave delle pagine. Cancellata
-- l'entità, se ne va con lei.
--
-- Nessun dato esistente viene modificato da questa migration.

BEGIN;

CREATE TABLE IF NOT EXISTS public.sezioni (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_tipo text NOT NULL CHECK (entity_tipo IN ('struttura','ristorante','attivita')),
  entity_id   uuid NOT NULL REFERENCES public.entita(id) ON DELETE CASCADE,
  nome        text NOT NULL DEFAULT '' CHECK (char_length(nome) <= 120),
  blocks      jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(blocks) = 'array'),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sezioni_entita_idx ON public.sezioni (entity_id);

-- Si legge e si scrive solo dalle nostre route (chiave di servizio), che
-- controllano di chi è l'entità. La RLS è accesa e non ha nessuna policy: chi
-- bussa al database senza passare da noi non ne vede una riga — nemmeno il
-- visitatore del sito, a cui il contenuto arriva già dentro la pagina.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sezioni TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sezioni TO service_role;
ALTER TABLE public.sezioni ENABLE ROW LEVEL SECURITY;

COMMIT;
