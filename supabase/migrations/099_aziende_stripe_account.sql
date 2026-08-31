-- L'account Stripe di ogni cliente.
--
-- Con Connect ogni azienda cliente ha il **proprio** account Stripe: incassa
-- lei, sul suo conto. Qui si tiene solo il riferimento — `acct_...` — per sapere
-- su quale account creare il pagamento quando qualcuno compra dal suo negozio.
--
-- ⚠️ Sta su `aziende` e non su `entita` perché il negozio è dell'azienda: gli
-- ordini hanno `azienda_id`, non `entity_id`. Un cliente con tre attività
-- incassa su un conto solo, che è come funziona nella realtà.
--
-- ⛔ Qui NON si tiene lo **stato** dell'onboarding.
--
-- Sarebbe comodo e sarebbe sbagliato: i requisiti di Stripe cambiano da soli
-- quando cambiano le regole dei circuiti o dei regolatori, e una copia nel
-- nostro database direbbe «tutto a posto» mentre l'account è bloccato. Lo stato
-- si chiede sempre all'API. Questa colonna dice solo *quale* account, non
-- *come sta*.

ALTER TABLE public.aziende
  ADD COLUMN IF NOT EXISTS stripe_account_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_aziende_stripe_account
  ON public.aziende (stripe_account_id) WHERE stripe_account_id IS NOT NULL;

COMMENT ON COLUMN public.aziende.stripe_account_id IS
  'Account Stripe connesso (acct_...). Solo il riferimento: lo stato si legge sempre dall''API.';

-- Il permesso di lettura resta a chi ha una sessione — serve al pannello per
-- sapere se mostrare «Collega Stripe» o «Gestisci». Nessun `anon`: a chi non ha
-- fatto login non riguarda su quale conto incassa un'azienda.
GRANT SELECT (stripe_account_id) ON public.aziende TO authenticated;

-- ⚠️ Nessun GRANT di UPDATE al ruolo `authenticated`: questa colonna la scrive
-- **solo** la route, con la chiave di servizio, dopo aver creato l'account.
-- Se un utente potesse scriverla, potrebbe puntare la propria azienda
-- all'account Stripe di un altro e dirottarci sopra gli incassi.

-- regola-ok: nessuna tabella nuova, una colonna su una tabella che ha gia permessi e RLS
