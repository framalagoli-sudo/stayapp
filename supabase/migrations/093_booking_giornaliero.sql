-- Prenotare a giornate: case, auto, camere, attrezzature.
--
-- Il booking sapeva fare due cose: **slot orari** (un campo da padel alle 18)
-- e **coperti** (quanti entrano a cena). Non sapeva fare la cosa più comune di
-- tutte: «da martedì a sabato». Chi affitta una casa, noleggia un'auto o dà una
-- camera prenota per giornate, e finora non aveva modo di dirlo.
--
-- Serve una sola colonna: la data di **fine**. Una prenotazione a slot occupa
-- un'ora di un giorno, una a giornate occupa un intervallo — e senza il secondo
-- estremo non si può sapere se due prenotazioni si accavallano.
--
-- Resta `data` come inizio: così le prenotazioni vecchie non cambiano di senso
-- e tutte le query che ordinano per data continuano a funzionare.

ALTER TABLE public.prenotazioni
  ADD COLUMN IF NOT EXISTS data_fine date;

-- Cercare le sovrapposizioni significa chiedere «quali prenotazioni di questa
-- risorsa toccano questo intervallo»: senza indice diventa una scansione piena
-- a ogni richiesta di disponibilità, che è la pagina più visitata di tutte.
CREATE INDEX IF NOT EXISTS idx_prenotazioni_periodo
  ON public.prenotazioni (risorsa_id, data, data_fine);

-- L'uscita non può venire prima dell'entrata. È il tipo di errore che nessuno
-- fa a mano ma che una richiesta costruita a mano fa eccome, e da lì
-- nascerebbero periodi di durata negativa che scavalcano ogni conteggio.
ALTER TABLE public.prenotazioni
  DROP CONSTRAINT IF EXISTS prenotazioni_periodo_valido;
ALTER TABLE public.prenotazioni
  ADD CONSTRAINT prenotazioni_periodo_valido
  CHECK (data_fine IS NULL OR data_fine >= data);

GRANT SELECT (data_fine) ON public.prenotazioni TO authenticated;

COMMENT ON COLUMN public.prenotazioni.data_fine IS
  'Ultimo giorno occupato, per le risorse a giornate. Null per slot orari e coperti.';

-- regola-ok: nessuna tabella nuova, una colonna su una tabella che ha gia permessi e RLS
