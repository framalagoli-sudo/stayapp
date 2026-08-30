-- Le foto di ciò che si prenota.
--
-- Un furgone da 90 € al giorno, una camera, una casa: si scelgono guardandoli.
-- Il modulo di prenotazione mostrava solo un nome e un prezzo, e chiedeva a chi
-- prenota di fidarsi di una riga di testo.
--
-- Una **galleria**, non una foto sola: per una camera servono il letto, il
-- bagno e la vista, e con un campo solo il cliente dovrebbe scegliere quale
-- sacrificare. La prima immagine fa da copertina — niente secondo campo
-- `copertina_url` da tenere allineato a mano, che è il tipo di doppione che
-- prima o poi diverge.
--
-- Forma: un array di URL, la stessa di `entita.gallery` e `offerte.galleria`.

ALTER TABLE public.risorse
  ADD COLUMN IF NOT EXISTS galleria jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.risorse.galleria IS
  'Foto della risorsa, array di URL. La prima è la copertina.';

-- La colonna esce da una route pubblica — il modulo di prenotazione risponde a
-- chi non ha fatto login — quindi il permesso di lettura va concesso
-- esplicitamente anche al ruolo anonimo.
--
-- ⚠️ Solo questa. La RLS filtra le righe, non le colonne: `GRANT SELECT` senza
-- elenco aprirebbe l'intera tabella, e in `risorse` ci sono anche le regole di
-- disponibilità e i blocchi, che sono come lavora il cliente.
GRANT SELECT (galleria) ON public.risorse TO anon;
GRANT SELECT (galleria) ON public.risorse TO authenticated;

-- regola-ok: nessuna tabella nuova, una colonna su una tabella che ha gia permessi e RLS
