-- Le attività stanno dentro categorie, e la categoria è roba scritta dal cliente.
--
-- Nella 087 non l'avevo prevista: `entita.activities` è un elenco di gruppi
-- (`[{ category: 'Attività sportive', items: [...] }]`) e migrandolo avevo
-- preso solo gli elementi, buttando il nome del gruppo. Un dato piccolo — una
-- riga su una — ma è un dato del cliente, e ricostruire le pagine pubbliche
-- senza di esso avrebbe cambiato quello che si vede.
--
-- Trovato prima di spostare la lettura, quindi non ha fatto danni: è il motivo
-- per cui la migrazione copia invece di spostare, e gli originali restano.

ALTER TABLE public.offerte
  ADD COLUMN IF NOT EXISTS categoria text;

-- Serve alle pagine pubbliche, che raggruppano le attività per categoria.
GRANT SELECT (categoria) ON public.offerte TO anon;

COMMENT ON COLUMN public.offerte.categoria IS
  'Il gruppo in cui il cliente ha messo questa offerta ("Attività sportive"). Testo libero, serve a raggrupparle sul sito.';
