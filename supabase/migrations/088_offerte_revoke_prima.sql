-- Correzione alla 087: senza REVOKE, il GRANT per colonna non restringe niente.
--
-- Nella 087 avevo concesso al ruolo pubblico solo le colonne che servono a
-- mostrare un'offerta su un sito, lasciando fuori `origine`, `origine_id` e i
-- due interruttori delle notifiche. La sonda ha misurato il contrario: un
-- estraneo le leggeva tutte.
--
-- Perché. Su Supabase una tabella nuova nello schema `public` nasce **già
-- accessibile** ai ruoli `anon` e `authenticated`, per via dei privilegi di
-- default dello schema. Un `GRANT SELECT (colonne)` non toglie niente: si
-- somma a un permesso più largo che c'era già. Per restringere davvero bisogna
-- prima **revocare**, poi riconcedere una colonna per volta — ed è quello che
-- avevo fatto nella 082 su `entita`, e qui ho dimenticato.
--
-- ⚠️ Regola per ogni tabella futura con colonne non pubbliche:
--       REVOKE SELECT ON <tabella> FROM anon;
--       GRANT  SELECT (colonne pubbliche) ON <tabella> TO anon;
--    In quest'ordine. Il solo GRANT dà l'illusione di aver ristretto.

REVOKE SELECT ON public.offerte FROM anon;

GRANT SELECT (
  id, azienda_id, entity_id, modo, impegno,
  titolo, descrizione, slug, cover_url, formato_cover, cover_focal, colore, luogo,
  prezzo, valuta, prezzo_testo, mostra_prezzo, mostra_prezzo_pagina, pacchetti,
  cta_label, cta_condizioni,
  data_inizio, data_fine, durata_minuti, quantita, max_coperti,
  posti_totali, posti_occupati, disponibilita, chiusure,
  attiva, pubblicata, ordine, created_at, updated_at
) ON public.offerte TO anon;

-- Chi ha una sessione continua a vedere tutto della propria azienda: la RLS
-- della 087 lo limita già alle proprie righe, e il titolare ha diritto di
-- vedere i propri interruttori delle notifiche.
