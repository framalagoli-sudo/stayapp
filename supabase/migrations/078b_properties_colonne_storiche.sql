-- Le colonne di `properties` che nessuna migration ha mai scritto.
--
-- ⛔ Trovate il 13/09/2026 provando il ripristino su un progetto vuoto: la
-- migration `079_entita_unificata.sql` — quella che crea `entita`, la tabella
-- centrale del prodotto — legge `properties.whatsapp`, e in un database
-- ricostruito da zero quella colonna non esiste. La 079 falliva, e con lei
-- cadevano 080, 082, 087, 091, 105 e tutta la famiglia `offerte`: dieci
-- migration in fila, per una colonna aggiunta a mano dal pannello e mai scritta.
--
-- Queste sei righe non cambiano NIENTE in produzione, dove le colonne ci sono
-- già: `IF NOT EXISTS` le rende innocue. Servono al database che non esiste
-- ancora — quello che si ricostruirà il giorno in cui questo sparisce.
--
-- ⚠️ Il nome del file è `078b` di proposito: deve girare PRIMA della 079, e i
-- file si eseguono in ordine alfabetico. Rinumerare le migration già applicate
-- sarebbe peggio: cambierebbe una storia che in produzione è già passata.

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS services   jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS gallery    jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS restaurant jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS activities jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS excursions jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS whatsapp   text;
