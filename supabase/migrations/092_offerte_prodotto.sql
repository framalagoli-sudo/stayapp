-- Un'offerta amplifica un prodotto che il cliente ha già caricato.
--
-- Il modello (vedi `CATALOGO.md`, deciso il 27/08): la cosa vive in un posto
-- solo — i **Prodotti** — e sopra ci vanno gli strati. *In offerta* è un atto
-- con un inizio e una fine: quando l'offerta finisce, **il prodotto resta**.
--
-- Perché `ON DELETE SET NULL` e non `CASCADE`: cancellando un prodotto le sue
-- offerte non spariscono. Un'offerta può avere prenotazioni e incassi dietro,
-- e non deve svanire perché qualcuno ha fatto pulizia nel catalogo. Resta,
-- semplicemente, senza il prodotto a cui puntava.

ALTER TABLE public.offerte
  ADD COLUMN IF NOT EXISTS prodotto_id uuid
  REFERENCES public.vetrina_elementi(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_offerte_prodotto ON public.offerte (prodotto_id);

-- La colonna è visibile solo a chi ha una sessione: le offerte pubbliche
-- passano dalle route, che elencano le colonne una per una.
GRANT SELECT (prodotto_id) ON public.offerte TO authenticated;

COMMENT ON COLUMN public.offerte.prodotto_id IS
  'Il prodotto (vetrina_elementi) che questa offerta amplifica. Null = offerta senza catalogo alle spalle.';

-- regola-ok: nessuna tabella nuova, una colonna su una tabella che ha gia permessi e RLS
