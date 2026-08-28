-- Quello che le promozioni sapevano fare e le offerte no.
--
-- «Promozioni» e «Pacchetti» erano due elenchi dentro il JSONB del minisito:
-- una **quarta porta** per creare cose da vendere, che non parlava né col
-- catalogo né con le offerte né con lo shop. Lo stesso difetto già chiuso sullo
-- shop il 27/08. Ci sono dati veri dentro, di un cliente.
--
-- ⚠️ Prima di copiarli ho guardato **cosa contengono**, e cinque cose non
-- avevano dove andare: la galleria, il prezzo pieno barrato, l'etichetta del
-- prezzo, cosa include, e dove porta il pulsante. Migrare senza queste colonne
-- avrebbe buttato via roba di un cliente.
--
-- Sono tutte **generiche**, non campi di un caso solo: qualunque offerta può
-- avere più foto, un prezzo barrato, un «a persona», un elenco di cosa
-- comprende. `cta_url` colma per giunta un buco che c'era già — un'offerta
-- aveva il testo del pulsante ma non dove mandare.

ALTER TABLE public.offerte
  ADD COLUMN IF NOT EXISTS galleria         jsonb   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS incluso          jsonb   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS cta_url          text,
  ADD COLUMN IF NOT EXISTS prezzo_barrato   numeric(10,2),
  ADD COLUMN IF NOT EXISTS prezzo_etichetta text;

COMMENT ON COLUMN public.offerte.galleria IS
  'Altre foto oltre alla copertina. Array di URL.';
COMMENT ON COLUMN public.offerte.incluso IS
  'Cosa comprende, una voce per riga. Array di stringhe.';
COMMENT ON COLUMN public.offerte.prezzo_barrato IS
  'Il prezzo pieno, da mostrare sbarrato accanto a quello vero. Non si addebita mai: il totale si calcola sempre da `prezzo`.';
COMMENT ON COLUMN public.offerte.prezzo_etichetta IS
  'A persona, a coppia, a notte. Solo testo: non entra in nessun conto.';
COMMENT ON COLUMN public.offerte.cta_url IS
  'Dove porta il pulsante, quando non porta al modulo di prenotazione.';

-- Le pagine pubbliche passano dalle route, che elencano le colonne una per una:
-- una colonna nuova non finisce online da sola. Qui si concede solo la lettura
-- a chi ha una sessione.
GRANT SELECT (galleria, incluso, cta_url, prezzo_barrato, prezzo_etichetta)
  ON public.offerte TO authenticated;

-- regola-ok: nessuna tabella nuova, cinque colonne su una tabella che ha gia permessi e RLS
