-- 137 — Il Club: la consulenza di OltreNova, scritta una volta e letta da tutti
--       i clienti (STRATEGIA.md §6.4, decisione di Francesco del 14/10/2026).
--
-- NON è un social: i clienti leggono e basta, non scrivono niente. I contenuti
-- li prepara la regia (solo super_admin): occasioni con una data («fra 10 giorni
-- è Halloween»), strategie di marketing, il focus del periodo. Ognuno può valere
-- per tutti o solo per alcuni mestieri (le chiavi di `profili_mestiere`, che
-- stanno su `entita.profilo`).
--
-- `club_letture` conta chi ha visto e chi ha premuto il pulsante: una riga per
-- contenuto, azienda e gesto. Nessun dato personale — è l'azienda, non la persona.
--
-- Nessun dato esistente viene modificato da questa migration.

BEGIN;

CREATE TABLE IF NOT EXISTS public.club_contenuti (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo          text NOT NULL CHECK (tipo IN ('occasione', 'strategia', 'focus')),
  titolo        text NOT NULL CHECK (char_length(titolo) BETWEEN 1 AND 160),
  -- Il testo accetta la formattazione di lib/testo-ricco.js, non HTML.
  testo         text NOT NULL DEFAULT '' CHECK (char_length(testo) <= 12000),
  -- NULL = per tutti; altrimenti le chiavi dei profili di mestiere.
  mestieri      text[] CHECK (mestieri IS NULL OR cardinality(mestieri) BETWEEN 1 AND 20),
  -- Il giorno dell'occasione (Halloween = 31/10): serve a scrivere «fra N giorni».
  data_occasione date,
  -- Da quando a quando compare in «Oggi per te». Senza fine resta in archivio e basta.
  visibile_dal  date NOT NULL DEFAULT CURRENT_DATE,
  visibile_al   date,
  -- Il pulsante: una chiave del catalogo chiuso in lib/club.js, mai un indirizzo.
  azione        text CHECK (azione IS NULL OR azione ~ '^[a-z_]{2,40}$'),
  stato         text NOT NULL DEFAULT 'bozza' CHECK (stato IN ('bozza', 'pubblicato')),
  creato_da     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (visibile_al IS NULL OR visibile_al >= visibile_dal)
);

CREATE INDEX IF NOT EXISTS club_contenuti_pubblicati_idx
  ON public.club_contenuti (stato, visibile_dal);

CREATE TABLE IF NOT EXISTS public.club_letture (
  contenuto_id uuid NOT NULL REFERENCES public.club_contenuti(id) ON DELETE CASCADE,
  azienda_id   uuid NOT NULL REFERENCES public.aziende(id) ON DELETE CASCADE,
  gesto        text NOT NULL CHECK (gesto IN ('visto', 'clic')),
  il           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (contenuto_id, azienda_id, gesto)
);

-- Si legge e si scrive solo dalle nostre route (chiave di servizio). RLS accesa
-- e nessuna policy: chi bussa al database senza passare da noi non vede niente.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_contenuti TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_contenuti TO service_role;
ALTER TABLE public.club_contenuti ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_letture TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_letture TO service_role;
ALTER TABLE public.club_letture ENABLE ROW LEVEL SECURITY;

COMMIT;
