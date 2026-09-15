-- Forma e punto focale anche sulle foto che non li avevano.
--
-- Il 14/09/2026 forma e punto focale sono arrivati su evento, Team, Foto+Testo,
-- Carosello e Card paragrafi — tutti blocchi che vivono in JSONB, quindi senza
-- toccare lo schema. Restavano tre foto che stanno in colonne vere:
--
--   entita.cover_focal        la copertina del sito. Si vede come STRISCIA alta
--                             200px in cima all'app del QR, con nome e scritte
--                             sopra: taglia molto, quindi il punto focale serve.
--                             La forma no: cambierebbe l'altezza della testata.
--
--   articoli.formato_cover    la copertina di un articolo del blog. Come per un
--   articoli.cover_focal      evento: la forma vale nella pagina dell'articolo,
--                             nell'elenco le schede restano uguali e decide il
--                             punto focale.
--
--   prodotti.immagine_focal   la prima foto di un prodotto, l'unica che il
--                             catalogo mostra. La FORMA delle schede non sta qui
--                             ma nel blocco del sito (vale per tutte insieme,
--                             come nel Team): se ogni prodotto tenesse la sua,
--                             un prodotto verticale sfonderebbe la riga.
--
-- ⚠️ Tutti questi valori finiscono in una proprietà CSS: le route li fanno
-- passare da `formatoValido` / `focalValido` (lib/formati-foto.js) e qui sotto
-- c'è il secondo muro, per chi scrivesse saltando le route.
--
-- NULL = come prima. Nessuna foto già online cambia aspetto.

ALTER TABLE public.entita   ADD COLUMN IF NOT EXISTS cover_focal     text;
ALTER TABLE public.articoli ADD COLUMN IF NOT EXISTS formato_cover   text;
ALTER TABLE public.articoli ADD COLUMN IF NOT EXISTS cover_focal     text;
ALTER TABLE public.prodotti ADD COLUMN IF NOT EXISTS immagine_focal  text;

ALTER TABLE public.entita DROP CONSTRAINT IF EXISTS entita_cover_focal_valido;
ALTER TABLE public.entita ADD CONSTRAINT entita_cover_focal_valido
  CHECK (cover_focal IS NULL OR cover_focal ~ '^[0-9]{1,3}% [0-9]{1,3}%$');

ALTER TABLE public.articoli DROP CONSTRAINT IF EXISTS articoli_formato_cover_ammesso;
ALTER TABLE public.articoli ADD CONSTRAINT articoli_formato_cover_ammesso
  CHECK (formato_cover IS NULL OR formato_cover IN ('quadrato', 'verticale', 'orizzontale', 'storia'));

ALTER TABLE public.articoli DROP CONSTRAINT IF EXISTS articoli_cover_focal_valido;
ALTER TABLE public.articoli ADD CONSTRAINT articoli_cover_focal_valido
  CHECK (cover_focal IS NULL OR cover_focal ~ '^[0-9]{1,3}% [0-9]{1,3}%$');

ALTER TABLE public.prodotti DROP CONSTRAINT IF EXISTS prodotti_immagine_focal_valido;
ALTER TABLE public.prodotti ADD CONSTRAINT prodotti_immagine_focal_valido
  CHECK (immagine_focal IS NULL OR immagine_focal ~ '^[0-9]{1,3}% [0-9]{1,3}%$');

-- Chi le legge.
--
-- `entita`: NESSUN grant al ruolo pubblico. Dal 25/08 (migration 082) ogni
-- colonna nuova di `entita` nasce invisibile a chi bussa al database senza
-- sessione; le pagine pubbliche la leggono dal server, con la chiave di servizio.
--
-- `articoli` e `prodotti`: le schede sono pubbliche per costruzione. Concesse
-- colonna per colonna, così la regola resta leggibile anche se un domani la
-- tabella passasse ai grant per colonna come `entita`.
GRANT SELECT (formato_cover, cover_focal) ON public.articoli TO anon;
GRANT SELECT (formato_cover, cover_focal) ON public.articoli TO authenticated;
GRANT SELECT (immagine_focal)             ON public.prodotti TO anon;
GRANT SELECT (immagine_focal)             ON public.prodotti TO authenticated;
