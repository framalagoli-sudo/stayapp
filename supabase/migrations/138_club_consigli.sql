-- 138 — I consigli personali nella regia del Club (decisione di Francesco del
--       14/10/2026: «mica li posso scrivere a mano… un'area in cui io posso operare»).
--
-- Un consiglio personale scatta dai numeri di UN cliente («23 persone vogliono
-- tue notizie e non hai mai scritto loro»). Fino a oggi ogni tipo di consiglio
-- era scritto nel codice: per cambiarne una parola serviva un deploy. Ora è una
-- riga qui, che la regia crea e modifica da sola:
--   · `segnale` = QUANDO scatta: una chiave del catalogo chiuso in
--     lib/consigli-segnali.js (le regole sui dati restano codice, provato);
--   · `parametri` = le soglie di quel segnale (quante persone, quanti giorni);
--   · `titolo` con i segnaposti del segnale ({persone}, {evento}…) e `perche`;
--   · `azione` = il pulsante, chiave di un catalogo chiuso, mai un indirizzo.
-- Al cliente arrivano solo i consigli `attivo`; le bozze le vede solo la regia.
--
-- Si parte con i quattro consigli che erano scritti nel codice, come BOZZE:
-- nessun cliente vede niente di nuovo finché Francesco non li attiva.

BEGIN;

CREATE TABLE IF NOT EXISTS public.club_consigli (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segnale     text NOT NULL CHECK (segnale ~ '^[a-z_]{2,40}$'),
  parametri   jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(parametri) = 'object'),
  -- NULL = per tutti; altrimenti le chiavi dei profili di mestiere.
  mestieri    text[] CHECK (mestieri IS NULL OR cardinality(mestieri) BETWEEN 1 AND 20),
  titolo      text NOT NULL CHECK (char_length(titolo) BETWEEN 1 AND 200),
  perche      text NOT NULL DEFAULT '' CHECK (char_length(perche) <= 2000),
  azione      text CHECK (azione IS NULL OR azione ~ '^[a-z_]{2,40}$'),
  stato       text NOT NULL DEFAULT 'bozza' CHECK (stato IN ('bozza', 'attivo')),
  -- Più basso = più importante: un cliente vede al massimo tre consigli.
  ordine      integer NOT NULL DEFAULT 100,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Solo dalle nostre route (chiave di servizio). RLS accesa, nessuna policy.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_consigli TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_consigli TO service_role;
ALTER TABLE public.club_consigli ENABLE ROW LEVEL SECURITY;

INSERT INTO public.club_consigli (segnale, parametri, titolo, perche, azione, ordine) VALUES
  ('evento_quasi_pieno', '{"percentuale": 85, "entro_giorni": 14}',
   '«{evento}» è quasi pieno: {prenotati} posti su {capienza}',
   'Quando un evento è quasi pieno, il rischio non è più vendere: è promettere posti che non ci sono. Chi risponde al telefono deve saperlo adesso, non la sera stessa.',
   'evento', 10),
  ('evento_poco_prenotato', '{"percentuale": 30, "entro_giorni": 7, "min_persone": 5}',
   '«{evento}» è fra {giorni_mancanti} giorni e ha ancora {posti_liberi} posti liberi',
   'Un evento che a pochi giorni ha ancora molti posti liberi di solito non si riempie da solo. Un messaggio a chi ti ha già detto sì costa due minuti ed è la promozione che rende di più.',
   'newsletter', 20),
  ('iscritti_senza_newsletter', '{"min_persone": 10, "giorni": 45}',
   '{persone} persone vogliono tue notizie, e non scrivi loro da troppo tempo',
   'Queste persone ti hanno chiesto di essere avvisate. Se non scrivi loro, fra qualche mese non si ricorderanno più di averlo chiesto, e quel sì vale sempre meno.',
   'newsletter', 30),
  ('calendario_vuoto', '{"min_passati": 2}',
   'Non hai eventi in programma',
   'Chi ha già partecipato a un tuo evento torna a guardare il sito per vedere cosa c’è dopo. Se il calendario è vuoto, va altrove.',
   'eventi', 40);

COMMIT;
