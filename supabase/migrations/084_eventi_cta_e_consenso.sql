-- Il pulsante dell'evento lo scrive il cliente, e chi prenota dà il consenso.
--
-- Due cose diverse, nate insieme:
--
-- 1) «Prenota ora» andava bene per tutti e per nessuno. Un ristorante scrive
--    «Prenota il tavolo», un'agenzia «Richiedi il preventivo», una palestra
--    «Iscriviti alla lezione». Sotto il pulsante ci va quello che il cliente
--    deve sapere prima di premerlo: caparra, disdetta, cosa è incluso.
--
-- 2) ⚠️ Il modulo di prenotazione raccoglie **nome, email e telefono** e non
--    chiedeva nessun consenso. È un dato personale trattato senza base
--    dimostrabile: il GDPR non chiede solo di raccoglierlo, chiede di poter
--    provare *quando* e *a quali condizioni* è stato dato. Da qui le tre
--    colonne su `event_bookings`, che non sono un adempimento formale ma la
--    prova, se un domani qualcuno la chiede.

ALTER TABLE public.eventi
  ADD COLUMN IF NOT EXISTS cta_label      text,
  ADD COLUMN IF NOT EXISTS cta_condizioni text;

-- Il pulsante è una riga, non un paragrafo; le condizioni stanno sotto un
-- pulsante, non sono le condizioni generali di contratto. Il limite si mette
-- qui perché una route distratta non basta: il testo finisce in pagina.
ALTER TABLE public.eventi
  DROP CONSTRAINT IF EXISTS eventi_cta_label_breve;
ALTER TABLE public.eventi
  ADD CONSTRAINT eventi_cta_label_breve
  CHECK (cta_label IS NULL OR char_length(cta_label) <= 60);

ALTER TABLE public.eventi
  DROP CONSTRAINT IF EXISTS eventi_cta_condizioni_breve;
ALTER TABLE public.eventi
  ADD CONSTRAINT eventi_cta_condizioni_breve
  CHECK (cta_condizioni IS NULL OR char_length(cta_condizioni) <= 600);

-- Servono alla scheda pubblica dell'evento: si concedono, una per una.
GRANT SELECT (cta_label, cta_condizioni) ON public.eventi TO anon;
GRANT SELECT (cta_label, cta_condizioni) ON public.eventi TO authenticated;

-- ── La prova del consenso ────────────────────────────────────────────────────
-- Non basta la spunta nel browser: quella si aggira. La route la pretende e la
-- scrive qui, con il momento esatto e il testo che la persona ha letto — perché
-- se domani cambiamo la formula, quella vecchia deve restare ricostruibile.
ALTER TABLE public.event_bookings
  ADD COLUMN IF NOT EXISTS privacy_accettata     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS privacy_accettata_il  timestamptz,
  ADD COLUMN IF NOT EXISTS privacy_testo         text;

-- Le prenotazioni non si leggono senza sessione: nessun GRANT ad `anon`.
GRANT SELECT (privacy_accettata, privacy_accettata_il, privacy_testo)
  ON public.event_bookings TO authenticated;

COMMENT ON COLUMN public.event_bookings.privacy_testo IS
  'La formula esatta accettata da chi prenota. Serve a ricostruire il consenso anche dopo che il testo è cambiato.';
