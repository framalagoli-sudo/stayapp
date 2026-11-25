-- Quando il pubblico vede quanti posti restano.
--
-- La pagina dell'evento e l'app del QR scrivevano sempre «60 posti
-- disponibili»: su una serata appena aperta vuol dire «non è venuto nessuno».
-- «Restano 6 posti» invece spinge a prenotare. Lo decide il locale, evento per
-- evento (Francesco, 25/11/2026):
--
--   mostra_posti         'sempre' (com'era) · 'mai' · 'soglia'
--   mostra_posti_soglia  con 'soglia': il numero compare quando è occupata
--                        questa percentuale dei posti (1–99, predefinito 80)
--
-- «Esaurito» si vede sempre: è un'informazione, non una vetrina.
-- Con le opzioni la regola vale per ognuna, sui suoi posti.
-- Gli eventi che ci sono già restano 'sempre': nessuno cambia faccia da solo.
--
-- Non si concedono al ruolo pubblico: le legge il server, che al sito manda
-- solo il risultato (`posti_visibili` in lib/posti-evento.js).

ALTER TABLE public.eventi
  ADD COLUMN IF NOT EXISTS mostra_posti text NOT NULL DEFAULT 'sempre',
  ADD COLUMN IF NOT EXISTS mostra_posti_soglia smallint NOT NULL DEFAULT 80;

ALTER TABLE public.eventi DROP CONSTRAINT IF EXISTS eventi_mostra_posti_valido;
ALTER TABLE public.eventi
  ADD CONSTRAINT eventi_mostra_posti_valido
  CHECK (mostra_posti IN ('sempre', 'mai', 'soglia'));

ALTER TABLE public.eventi DROP CONSTRAINT IF EXISTS eventi_mostra_posti_soglia_valida;
ALTER TABLE public.eventi
  ADD CONSTRAINT eventi_mostra_posti_soglia_valida
  CHECK (mostra_posti_soglia BETWEEN 1 AND 99);

COMMENT ON COLUMN public.eventi.mostra_posti IS
  'Quando il pubblico vede i posti rimasti: sempre · mai · soglia. «Esaurito» si vede comunque.';
COMMENT ON COLUMN public.eventi.mostra_posti_soglia IS
  'Con mostra_posti = soglia: percentuale di posti occupati da cui il numero compare.';
