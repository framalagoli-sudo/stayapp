-- 143 — Com'è andata una newsletter: consegnate, aperte, cliccate, per persona e per link.
--
-- Garage 22, 28/10/2026, dopo la prima newsletter: «potremmo avere statistiche
-- di apertura come fa MailUp?». Resend sa misurare aperture e clic e ce lo dice
-- col webhook (lo stesso dei rimbalzi); finora quegli eventi si buttavano.
--
-- `newsletter_destinatari` = una riga per ogni email partita, scritta all'invio
-- con l'identificativo che Resend le ha dato (`resend_id`): è da lì che il
-- webhook risale a quale newsletter e a quale persona si riferisce un evento.
-- Le colonne `*_il` dicono la PRIMA volta (consegnata, aperta, cliccata…): il
-- resoconto conta persone, non aperture ripetute.
--
-- ⚠️ Nessun dato personale qui dentro: chi sia lo dice `contatto_id`. Così
-- «Rendi anonimo» sulla scheda vale anche per le statistiche, e cancellare un
-- contatto porta via le sue righe (CASCADE).
--
-- `newsletter_clic` = quali link ha premuto ciascuno (una riga per persona e link).
-- Indirizzo e programma di chi clicca, che Resend manda, NON si salvano.

CREATE TABLE IF NOT EXISTS public.newsletter_destinatari (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id uuid NOT NULL REFERENCES public.newsletters(id) ON DELETE CASCADE,
  azienda_id    uuid NOT NULL REFERENCES public.aziende(id) ON DELETE CASCADE,
  contatto_id   uuid NOT NULL REFERENCES public.contatti(id) ON DELETE CASCADE,
  resend_id     text UNIQUE,
  consegnata_il timestamptz,
  aperta_il     timestamptz,
  cliccata_il   timestamptz,
  rimbalzata_il timestamptz,
  spam_il       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS newsletter_destinatari_nl_idx ON public.newsletter_destinatari (newsletter_id);
CREATE INDEX IF NOT EXISTS newsletter_destinatari_contatto_idx ON public.newsletter_destinatari (contatto_id);

CREATE TABLE IF NOT EXISTS public.newsletter_clic (
  destinatario_id uuid NOT NULL REFERENCES public.newsletter_destinatari(id) ON DELETE CASCADE,
  newsletter_id   uuid NOT NULL REFERENCES public.newsletters(id) ON DELETE CASCADE,
  link            text NOT NULL CHECK (char_length(link) <= 2000),
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (destinatario_id, link)
);
CREATE INDEX IF NOT EXISTS newsletter_clic_nl_idx ON public.newsletter_clic (newsletter_id);

-- Le leggono e scrivono solo le route (chiave di servizio). Nessuna policy per
-- `authenticated`: dal browser non si legge niente, nemmeno le proprie.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletter_destinatari TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletter_destinatari TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletter_clic TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletter_clic TO service_role;
ALTER TABLE public.newsletter_destinatari ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_clic ENABLE ROW LEVEL SECURITY;
