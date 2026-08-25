-- Il prezzo si mostra in due posti diversi, e sono due decisioni diverse.
--
-- Nella **copertina** (la scheda nell'elenco) il prezzo serve a farsi scegliere,
-- o a non spaventare: c'è chi lo vuole in vetrina e chi preferisce che si apra
-- prima la pagina. Nella **pagina aperta** invece è un'informazione che serve a
-- decidere, e quasi sempre va data.
--
-- Finora `mostra_prezzo` valeva per entrambi: una scelta sola per due domande.
--
--   mostra_prezzo         → nella scheda dell'elenco (già esistente)
--   mostra_prezzo_pagina  → nella pagina dell'evento aperta
--
-- Entrambe nascono a `true`, quindi gli eventi che ci sono già non cambiano.

ALTER TABLE public.eventi
  ADD COLUMN IF NOT EXISTS mostra_prezzo_pagina boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.eventi.mostra_prezzo IS
  'Se il prezzo compare nella scheda dell''elenco (la copertina).';
COMMENT ON COLUMN public.eventi.mostra_prezzo_pagina IS
  'Se il prezzo compare nella pagina dell''evento aperta. Indipendente dalla copertina.';

-- Serve alla scheda pubblica: si concede, come le altre.
GRANT SELECT (mostra_prezzo_pagina) ON public.eventi TO anon;
GRANT SELECT (mostra_prezzo_pagina) ON public.eventi TO authenticated;
