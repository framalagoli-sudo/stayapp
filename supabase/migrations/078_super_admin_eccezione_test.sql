-- Correzione alla 076: il vincolo "un solo super_admin" bloccava anche gli
-- smoke test, che creano un utente CI con quel ruolo per poter percorrere tutto
-- il pannello (comprese le pagine "Piattaforma", che solo un super_admin vede).
-- Risultato: l'intera suite non partiva più.
--
-- L'eccezione è ristretta al dominio `@playwright.internal`, che è finto e non
-- riceve posta: nessuna persona reale può averlo, e per crearne uno servirebbe
-- comunque già l'accesso amministrativo a Supabase. Gli utenti CI vivono pochi
-- minuti e vengono cancellati dal teardown.
--
-- Il vincolo per gli utenti veri resta identico: uno solo, e nessuna route può
-- aggirarlo.

CREATE OR REPLACE FUNCTION public.impedisci_secondo_super_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  gia_esistente uuid;
  email_utente  text;
BEGIN
  IF NEW.role IS DISTINCT FROM 'super_admin' THEN
    RETURN NEW;
  END IF;

  -- Utenti effimeri dei test: dominio finto, vita di pochi minuti.
  SELECT email INTO email_utente FROM auth.users WHERE id = NEW.id;
  IF email_utente LIKE '%@playwright.internal' THEN
    RETURN NEW;
  END IF;

  -- Chi è già super_admin resta tale: qui si impedisce di aggiungerne un altro,
  -- non di salvare modifiche al proprietario esistente. Gli utenti di test non
  -- contano come "già esistente", altrimenti una corsa in corso bloccherebbe
  -- quella dopo.
  SELECT p.id INTO gia_esistente
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.role = 'super_admin'
    AND p.id <> NEW.id
    AND u.email NOT LIKE '%@playwright.internal'
  LIMIT 1;

  IF gia_esistente IS NOT NULL THEN
    RAISE EXCEPTION 'Esiste già un super_admin (%). La piattaforma ne ammette uno solo.', gia_esistente
      USING HINT = 'Per un subentro, disattivare temporaneamente trg_un_solo_super_admin dal SQL Editor.';
  END IF;

  RETURN NEW;
END;
$$;
