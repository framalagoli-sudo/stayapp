-- Il fuso orario dell'azienda.
--
-- Chi prenota scrive «10:00» pensando al proprio orologio. Il server costruiva
-- `new Date('2026-09-04T10:00')` senza fuso, quindi lo leggeva nel PROPRIO — e
-- Vercel gira in UTC. Per un'attività italiana quelle 10:00 diventavano le
-- 12:00: il promemoria «24 ore prima» partiva due ore prima del dovuto, e la
-- finestra di cancellazione si spostava della stessa quantità (si poteva non
-- riuscire a disdire avendone diritto). Da un fuso americano lo scarto sarebbe
-- di otto ore.
--
-- ⚠️ Sta sull'AZIENDA, non sull'entità: un titolare lavora in un posto solo, e
-- chiederglielo per ogni sede sarebbe una domanda in più con una sola risposta
-- possibile. Se un giorno servirà per sede, il codice legge già da un punto solo
-- (lib/fuso.js) e si aggiunge lì.
--
-- Il valore è un nome IANA («Europe/Rome», «America/New_York»), non uno scarto
-- in ore: lo scarto cambia due volte l'anno con l'ora legale, il nome no.

ALTER TABLE public.aziende
  ADD COLUMN IF NOT EXISTS fuso_orario text NOT NULL DEFAULT 'Europe/Rome';

COMMENT ON COLUMN public.aziende.fuso_orario IS
  'Nome IANA del fuso (es. Europe/Rome). Il default vale per le aziende già esistenti, tutte italiane: chi si registra da qui in avanti se lo porta dal proprio browser.';

-- Nessun GRANT nuovo: la colonna sta su una tabella che ne ha già, e al pubblico
-- non serve — le pagine dei clienti non hanno motivo di sapere dove si trova un
-- server rispetto a un orologio.
