-- Il punteggio vero da Google (e domani da TripAdvisor).
--
-- Finora un cliente poteva SCRIVERE «4,8 su Google» in un blocco di testo. È
-- vero il giorno che lo scrivi e falso il mese dopo, e nessuno se ne accorge —
-- men che meno chi legge. Questo campo tiene il punteggio **chiesto alla fonte**,
-- con la data in cui è stato chiesto: se invecchia, si vede.
--
-- Forma:
--   {
--     "google": {
--       "place_id":   "ChIJ...",           -- il collegamento, scelto una volta
--       "rating":     4.8,
--       "totale":     127,                  -- quante recensioni
--       "url":        "https://…",          -- dove leggerle
--       "aggiornato": "2026-09-02T10:00:00Z",
--       "errore":     null                  -- se l'ultima lettura è fallita
--     }
--   }
--
-- ⚠️ Un fornitore per chiave, e la chiave è il nome del fornitore: TripAdvisor
-- entrerà accanto senza toccare né questa colonna né chi la legge. Serve
-- davvero, perché la Content API di TripAdvisor è stata dismessa il 31/08/2026 e
-- la sostituta (Terra) ha tempi ancora incerti: la struttura deve poter
-- aspettare senza che nessuno riapra il database.

ALTER TABLE public.entita
  ADD COLUMN IF NOT EXISTS recensioni_esterne jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.entita.recensioni_esterne IS
  'Punteggi letti dalle piattaforme esterne, per fornitore. Contiene la data di lettura: un punteggio senza data non si può mostrare onestamente.';

-- 🔒 La colonna è pubblica DI PROPOSITO: il punteggio compare sul sito del
-- cliente, quindi lo deve poter leggere anche chi non ha fatto login. Si concede
-- una colonna per volta — la RLS filtra le righe, non le colonne, e su `entita`
-- ogni colonna nuova nasce invisibile al ruolo pubblico (migration 082).
GRANT SELECT (recensioni_esterne) ON public.entita TO anon;

-- Il nuovo processo entra nel battito, o nessuno si accorge se smette di girare.
-- Soglia generosa rispetto alla cadenza (una volta al giorno, alle 4): meglio
-- accorgersene con qualche ora di ritardo che avere falsi allarmi.
INSERT INTO public.cron_battiti (nome, soglia_minuti) VALUES
  ('recensioni-esterne', 1800)
ON CONFLICT (nome) DO UPDATE SET soglia_minuti = EXCLUDED.soglia_minuti;
