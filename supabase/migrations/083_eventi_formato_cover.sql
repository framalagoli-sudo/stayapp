-- La foto di un evento può avere il formato che l'autore ha in mente.
--
-- Fino a oggi la locandina di un evento veniva mostrata sempre orizzontale, e
-- una foto verticale — che è il formato in cui la gente le prepara, perché è
-- quello dei social — arrivava tagliata a metà.
--
-- Due colonne:
--   formato_cover  quale rapporto usare nella pagina dell'evento
--   cover_focal    quale parte della foto tenere quando la scheda la ritaglia
--
-- ⚠️ Entrambe finiscono in una proprietà CSS, quindi **non si scrivono mai
-- così come arrivano**: le route le fanno passare da `formatoValido` e
-- `focalValido` (lib/formati-foto.js), che accettano solo una chiave del
-- catalogo e una coppia di percentuali. Un valore fuori elenco diventa NULL,
-- cioè il predefinito — non un errore, e nemmeno una stringa arbitraria che
-- finisce nella pagina di un cliente.
--
-- NULL su entrambe = come prima: orizzontale, centrato. Gli eventi che ci sono
-- già non cambiano di una virgola.

ALTER TABLE public.eventi
  ADD COLUMN IF NOT EXISTS formato_cover text,
  ADD COLUMN IF NOT EXISTS cover_focal   text;

-- Secondo muro: il vincolo vale anche per chi scrivesse saltando le route.
ALTER TABLE public.eventi
  DROP CONSTRAINT IF EXISTS eventi_formato_cover_ammesso;
ALTER TABLE public.eventi
  ADD CONSTRAINT eventi_formato_cover_ammesso
  CHECK (formato_cover IS NULL OR formato_cover IN ('quadrato', 'verticale', 'orizzontale', 'storia'));

ALTER TABLE public.eventi
  DROP CONSTRAINT IF EXISTS eventi_cover_focal_valido;
ALTER TABLE public.eventi
  ADD CONSTRAINT eventi_cover_focal_valido
  CHECK (cover_focal IS NULL OR cover_focal ~ '^[0-9]{1,3}% [0-9]{1,3}%$');

-- Le due colonne servono anche alle pagine pubbliche (la scheda dell'evento è
-- visibile a chiunque), quindi vanno concesse al ruolo pubblico. Le altre
-- colonne di `eventi` lo erano già: qui si aggiungono solo queste due, perché
-- dal 25/08 ogni colonna nuova nasce invisibile finché non la si concede.
GRANT SELECT (formato_cover, cover_focal) ON public.eventi TO anon;
GRANT SELECT (formato_cover, cover_focal) ON public.eventi TO authenticated;
