-- Gli indirizzi vecchi di un evento non si perdono.
--
-- Da ora un evento si apre con un indirizzo parlante (`/eventi/cena-di-natale`)
-- invece che con il suo id. Lo slug nasce dal titolo, ma il titolo cambia — e
-- infatti c'è già un evento che si chiama «A cena con Chiara e Daniele» e ha
-- come indirizzo `a-cena-con-sara-e-chiara`. Quando il cliente lo corregge,
-- l'indirizzo vecchio deve continuare a portare all'evento: chi l'ha condiviso
-- su Facebook non torna indietro a cambiare il link.
--
-- Qui si tiene l'elenco degli indirizzi che quell'evento ha avuto. Chi arriva
-- da uno di quelli viene mandato (301) a quello nuovo.
--
-- ⚠️ Nessun GRANT al ruolo `anon`: questa colonna serve solo al server, che
-- risolve l'indirizzo con la chiave di servizio. Dalla migration 082 ogni
-- colonna nuova nasce invisibile al pubblico, e questa ci resta.

ALTER TABLE public.eventi
  ADD COLUMN IF NOT EXISTS slug_precedenti text[] NOT NULL DEFAULT '{}';

-- Cercare per indirizzo vecchio deve costare quanto cercare per quello attuale.
CREATE INDEX IF NOT EXISTS eventi_slug_precedenti_idx
  ON public.eventi USING gin (slug_precedenti);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.eventi TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eventi TO service_role;
