-- Un solo super_admin, garantito dal database.
--
-- Il super_admin bypassa OGNI controllo multi-tenant: è la chiave che apre i
-- dati di tutte le aziende. La piattaforma ha un unico proprietario, quindi di
-- quella chiave ne esiste una sola — decisione di Francesco, 24/08/2026.
--
-- Il controllo sta anche nel database, non solo nelle route, perché le route
-- usano la service_role key e bypassano la RLS: una route futura scritta
-- distrattamente potrebbe crearne un altro senza che nessuno se ne accorga.
-- Qui invece non passa, da nessuna strada.
--
-- ⚠️ RECUPERO DELL'ACCESSO: se un giorno servisse un nuovo super_admin (account
-- perso, subentro), si disattiva il vincolo per il tempo necessario:
--     ALTER TABLE public.profiles DISABLE TRIGGER trg_un_solo_super_admin;
--     UPDATE public.profiles SET role = 'super_admin' WHERE id = '<uuid>';
--     ALTER TABLE public.profiles ENABLE TRIGGER trg_un_solo_super_admin;
-- Va fatto dal SQL Editor di Supabase: un gesto deliberato, non una spunta.

CREATE OR REPLACE FUNCTION public.impedisci_secondo_super_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  gia_esistente uuid;
BEGIN
  IF NEW.role IS DISTINCT FROM 'super_admin' THEN
    RETURN NEW;
  END IF;

  -- Chi è già super_admin resta tale: qui si impedisce di aggiungerne un altro,
  -- non di salvare modifiche al proprietario esistente.
  SELECT id INTO gia_esistente
  FROM public.profiles
  WHERE role = 'super_admin' AND id <> NEW.id
  LIMIT 1;

  IF gia_esistente IS NOT NULL THEN
    RAISE EXCEPTION 'Esiste già un super_admin (%). La piattaforma ne ammette uno solo.', gia_esistente
      USING HINT = 'Per un subentro, disattivare temporaneamente trg_un_solo_super_admin dal SQL Editor.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_un_solo_super_admin ON public.profiles;
CREATE TRIGGER trg_un_solo_super_admin
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.impedisci_secondo_super_admin();

-- NOTA per chi scrive test e sonde: il trigger blocca anche la service_role, che
-- normalmente bypassa la RLS. È voluto — è il senso del vincolo — ma significa
-- che una sonda non può più crearsi un super_admin effimero per provare le
-- funzioni riservate. Va provata entrando col proprio account, oppure
-- disattivando il trigger per il tempo del test e riattivandolo subito.
