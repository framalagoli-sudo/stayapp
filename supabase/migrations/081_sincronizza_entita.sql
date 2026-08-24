-- Rete temporanea: tiene `entita` allineata mentre il codice usa ancora le tre
-- tabelle di partenza.
--
-- Durante la migrazione il codice continua a scrivere su `properties`,
-- `ristoranti` e `attivita`. Senza questa sincronizzazione, `entita` invecchia
-- e nel momento del passaggio si perderebbe tutto ciò che i clienti hanno fatto
-- nel frattempo. Con questa, la copia è sempre aggiornata e il passaggio può
-- avvenire in qualsiasi momento.
--
-- ⚠️ È PROVVISORIA. Va rimossa (migration 084) subito dopo che il codice legge e
-- scrive su `entita`: da quel momento la direzione si invertirebbe e due
-- sorgenti che si copiano a vicenda sono un guaio. La rimozione fa parte del
-- piano, non è un "poi vediamo".
--
-- Direzione unica: vecchie tabelle → entita. Mai il contrario.

-- ── strutture ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sincronizza_struttura()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.entita WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.entita (
    id, azienda_id, tipo, slug, name, description, address, phone, email, whatsapp,
    logo_url, logo_dark_url, cover_url, gallery, theme, minisito,
    services, activities, excursions, amenities, restaurant,
    wifi_name, wifi_password, checkin_time, checkout_time, rules,
    moduli, chatbot, privacy_data, plan, group_id, active, created_at, updated_at, origine_tabella
  ) VALUES (
    NEW.id, NEW.azienda_id, 'struttura', NEW.slug, NEW.name, NEW.description, NEW.address, NEW.phone, NEW.email, NEW.whatsapp,
    NEW.logo_url, NEW.logo_dark_url, NEW.cover_url, NEW.gallery, NEW.theme, NEW.minisito,
    NEW.services, NEW.activities, NEW.excursions, NEW.amenities, NEW.restaurant,
    NEW.wifi_name, NEW.wifi_password, NEW.checkin_time, NEW.checkout_time, NEW.rules,
    COALESCE(NEW.modules, '{}'::jsonb), NEW.chatbot, NEW.privacy_data, NEW.plan::text, NEW.group_id,
    NEW.active, NEW.created_at, NEW.updated_at, 'properties'
  )
  ON CONFLICT (id) DO UPDATE SET
    azienda_id = EXCLUDED.azienda_id, slug = EXCLUDED.slug, name = EXCLUDED.name,
    description = EXCLUDED.description, address = EXCLUDED.address, phone = EXCLUDED.phone,
    email = EXCLUDED.email, whatsapp = EXCLUDED.whatsapp,
    logo_url = EXCLUDED.logo_url, logo_dark_url = EXCLUDED.logo_dark_url, cover_url = EXCLUDED.cover_url,
    gallery = EXCLUDED.gallery, theme = EXCLUDED.theme, minisito = EXCLUDED.minisito,
    services = EXCLUDED.services, activities = EXCLUDED.activities, excursions = EXCLUDED.excursions,
    amenities = EXCLUDED.amenities, restaurant = EXCLUDED.restaurant,
    wifi_name = EXCLUDED.wifi_name, wifi_password = EXCLUDED.wifi_password,
    checkin_time = EXCLUDED.checkin_time, checkout_time = EXCLUDED.checkout_time, rules = EXCLUDED.rules,
    moduli = EXCLUDED.moduli, chatbot = EXCLUDED.chatbot, privacy_data = EXCLUDED.privacy_data,
    plan = EXCLUDED.plan, group_id = EXCLUDED.group_id,
    active = EXCLUDED.active, updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END; $$;

-- ── ristoranti ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sincronizza_ristorante()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.entita WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.entita (
    id, azienda_id, tipo, slug, name, description, address, phone, email, schedule,
    logo_url, logo_dark_url, cover_url, gallery, theme, minisito, menu,
    moduli, chatbot, privacy_data, active, created_at, updated_at, origine_tabella
  ) VALUES (
    NEW.id, NEW.azienda_id, 'ristorante', NEW.slug, NEW.name, NEW.description, NEW.address, NEW.phone, NEW.email, NEW.schedule,
    NEW.logo_url, NEW.logo_dark_url, NEW.cover_url, NEW.gallery, NEW.theme, NEW.minisito, NEW.menu,
    COALESCE(NEW.modules, '{}'::jsonb), NEW.chatbot, NEW.privacy_data, NEW.active, NEW.created_at, NEW.updated_at, 'ristoranti'
  )
  ON CONFLICT (id) DO UPDATE SET
    azienda_id = EXCLUDED.azienda_id, slug = EXCLUDED.slug, name = EXCLUDED.name,
    description = EXCLUDED.description, address = EXCLUDED.address, phone = EXCLUDED.phone,
    email = EXCLUDED.email, schedule = EXCLUDED.schedule,
    logo_url = EXCLUDED.logo_url, logo_dark_url = EXCLUDED.logo_dark_url, cover_url = EXCLUDED.cover_url,
    gallery = EXCLUDED.gallery, theme = EXCLUDED.theme, minisito = EXCLUDED.minisito, menu = EXCLUDED.menu,
    moduli = EXCLUDED.moduli, chatbot = EXCLUDED.chatbot, privacy_data = EXCLUDED.privacy_data,
    active = EXCLUDED.active, updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END; $$;

-- ── attività ────────────────────────────────────────────────────────────────
-- `tipo` qui è la descrizione del settore, non il tipo tecnico: va in `settore`.
CREATE OR REPLACE FUNCTION public.sincronizza_attivita()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.entita WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.entita (
    id, azienda_id, tipo, settore, slug, name, description, address, phone, email, schedule,
    logo_url, logo_dark_url, cover_url, gallery, theme, minisito, services,
    moduli, chatbot, privacy_data, active, created_at, updated_at, origine_tabella
  ) VALUES (
    NEW.id, NEW.azienda_id, 'attivita', NULLIF(NULLIF(NEW.tipo, 'attivita'), 'attività'),
    NEW.slug, NEW.name, NEW.description, NEW.address, NEW.phone, NEW.email, NEW.schedule,
    NEW.logo_url, NEW.logo_dark_url, NEW.cover_url, NEW.gallery, NEW.theme, NEW.minisito, NEW.services,
    COALESCE(NEW.pwa, '{}'::jsonb), NEW.chatbot, NEW.privacy_data, NEW.active, NEW.created_at, NEW.updated_at, 'attivita'
  )
  ON CONFLICT (id) DO UPDATE SET
    azienda_id = EXCLUDED.azienda_id, settore = EXCLUDED.settore, slug = EXCLUDED.slug, name = EXCLUDED.name,
    description = EXCLUDED.description, address = EXCLUDED.address, phone = EXCLUDED.phone,
    email = EXCLUDED.email, schedule = EXCLUDED.schedule,
    logo_url = EXCLUDED.logo_url, logo_dark_url = EXCLUDED.logo_dark_url, cover_url = EXCLUDED.cover_url,
    gallery = EXCLUDED.gallery, theme = EXCLUDED.theme, minisito = EXCLUDED.minisito, services = EXCLUDED.services,
    moduli = EXCLUDED.moduli, chatbot = EXCLUDED.chatbot, privacy_data = EXCLUDED.privacy_data,
    active = EXCLUDED.active, updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sincronizza_struttura ON public.properties;
CREATE TRIGGER trg_sincronizza_struttura
  AFTER INSERT OR UPDATE OR DELETE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.sincronizza_struttura();

DROP TRIGGER IF EXISTS trg_sincronizza_ristorante ON public.ristoranti;
CREATE TRIGGER trg_sincronizza_ristorante
  AFTER INSERT OR UPDATE OR DELETE ON public.ristoranti
  FOR EACH ROW EXECUTE FUNCTION public.sincronizza_ristorante();

DROP TRIGGER IF EXISTS trg_sincronizza_attivita ON public.attivita;
CREATE TRIGGER trg_sincronizza_attivita
  AFTER INSERT OR UPDATE OR DELETE ON public.attivita
  FOR EACH ROW EXECUTE FUNCTION public.sincronizza_attivita();
