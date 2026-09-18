-- Come si legge il prezzo di un evento: lo dice il cliente, non lo deduciamo noi.
--
-- ⛔ Segnalato da Garage 22 (18/09/2026): la cena si paga sul posto, il campo
-- prezzo era vuoto, e la pagina dell'evento scriveva **«Gratuito»**. Non un
-- dettaglio estetico: un'informazione falsa a chi prenota.
--
-- Il difetto era la deduzione: «nessuna cifra» veniva letto come «è gratis»,
-- mentre vuol dire «nessuno l'ha detto». Ora la scelta è esplicita:
--   'gratuito' → si scrive «Gratis»
--   'cifra'    → si scrive il prezzo (`price`)
--   'testo'    → si scrive quello che ha scritto il cliente (`prezzo_testo`)
--   NULL       → non si scrive niente, perché nessuno ha deciso
--
-- `mostra_prezzo` e `mostra_prezzo_pagina` restano: dicono DOVE mostrarlo
-- (copertina, pagina), che è una domanda diversa da COSA mostrare.

ALTER TABLE public.eventi
  ADD COLUMN IF NOT EXISTS prezzo_modo text;

ALTER TABLE public.eventi DROP CONSTRAINT IF EXISTS eventi_prezzo_modo_chk;
ALTER TABLE public.eventi ADD CONSTRAINT eventi_prezzo_modo_chk
  CHECK (prezzo_modo IS NULL OR prezzo_modo IN ('gratuito', 'cifra', 'testo'));

-- Gli eventi che già esistono conservano quello che mostrano oggi, tranne quelli
-- che dicono «Gratuito» senza che nessuno l'abbia scelto: quelli restano NULL e
-- da domani non scrivono niente. Al 18/09/2026 sono due, e uno è proprio la
-- segnalazione di Garage 22.
UPDATE public.eventi SET prezzo_modo = 'testo'
  WHERE prezzo_modo IS NULL AND coalesce(btrim(prezzo_testo), '') <> '';

UPDATE public.eventi SET prezzo_modo = 'cifra'
  WHERE prezzo_modo IS NULL AND coalesce(price, 0) > 0;

-- La colonna esce dalle route pubbliche degli eventi: senza il permesso, la
-- pagina non saprebbe cosa scrivere.
GRANT SELECT (prezzo_modo) ON public.eventi TO anon;
GRANT SELECT (prezzo_modo) ON public.eventi TO authenticated;
GRANT UPDATE (prezzo_modo) ON public.eventi TO authenticated;
GRANT SELECT (prezzo_modo), UPDATE (prezzo_modo), INSERT (prezzo_modo) ON public.eventi TO service_role;
