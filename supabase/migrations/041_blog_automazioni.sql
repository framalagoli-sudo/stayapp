-- Migration 041: Blog Automazioni (generazione articoli pianificata)
CREATE TABLE IF NOT EXISTS public.blog_automazioni (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id        uuid REFERENCES public.aziende(id) ON DELETE CASCADE NOT NULL,
  entity_tipo       text NOT NULL CHECK (entity_tipo IN ('struttura','ristorante','attivita')),
  entity_id         uuid NOT NULL,
  entity_nome       text,
  attiva            boolean DEFAULT true,
  frequenza         text DEFAULT 'settimanale' CHECK (frequenza IN ('giornaliera','settimanale','mensile')),
  ora_pubblicazione int  DEFAULT 9 CHECK (ora_pubblicazione BETWEEN 0 AND 23),
  giorno_settimana  int  DEFAULT 1 CHECK (giorno_settimana  BETWEEN 0 AND 6),  -- 0=dom JS
  giorno_mese       int  DEFAULT 1 CHECK (giorno_mese       BETWEEN 1 AND 28),
  argomenti         text[] DEFAULT '{}',
  modalita          text DEFAULT 'bozza' CHECK (modalita IN ('bozza','pubblica')),
  notifica_email    text,
  last_run_at       timestamptz,
  next_run_at       timestamptz,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_automazioni_azienda ON public.blog_automazioni(azienda_id);
CREATE INDEX IF NOT EXISTS idx_blog_automazioni_next    ON public.blog_automazioni(next_run_at) WHERE attiva = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_automazioni TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_automazioni TO service_role;
ALTER TABLE public.blog_automazioni ENABLE ROW LEVEL SECURITY;
