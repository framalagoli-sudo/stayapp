-- 140 — I resoconti per email: la frequenza la decide OltreNova, per azienda
--
-- Decisione di Francesco (15/10/2026): ogni cliente riceve il resoconto OGNI
-- SETTIMANA oppure OGNI MESE, non entrambi, e lo sceglie lui dal cruscotto
-- dell'azienda. Il titolare non sceglie. La 139 aveva messo la scelta sul
-- profilo di ogni persona: si sposta sull'azienda, e la colonna sul profilo
-- (nata con la 139, mai usata) si toglie.
--
-- Predefinito: ogni mese (il report del mese è quello di STRATEGIA §4.1).

ALTER TABLE public.aziende
  ADD COLUMN IF NOT EXISTS resoconti text NOT NULL DEFAULT 'mensile'
  CHECK (resoconti IN ('settimanale', 'mensile', 'nessuno'));

-- Nessun GRANT al browser: `aziende` concede le colonne una per una (099, 101)
-- e questa la leggono e scrivono solo le route, con la service_role.

ALTER TABLE public.profiles DROP COLUMN IF EXISTS resoconti;
