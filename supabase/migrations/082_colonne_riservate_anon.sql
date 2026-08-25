-- Le colonne riservate non escono nemmeno bussando al database.
--
-- Il 25/08/2026, dopo aver tolto la password del WiFi dalle pagine pubbliche,
-- l'ho ritrovata da un'altra porta: un estraneo con la **chiave pubblica** —
-- quella che sta nel bundle di ogni pagina e che chiunque può leggere — poteva
-- chiedere a Supabase `select slug, wifi_password from entita` e ottenerla in
-- chiaro per tutte le strutture. Insieme usciva `privacy_data`, che contiene il
-- codice fiscale del titolare.
--
-- Perché la RLS non bastava: **la RLS filtra le righe, non le colonne.** La
-- politica su `entita` lascia leggere le entità attive (giusto: servono alle
-- pagine pubbliche) e con esse partiva l'intera riga. Lo strumento per le
-- colonne sono i GRANT.
--
-- Le route API non sono toccate: usano la chiave di servizio, che ha i suoi
-- permessi e continua a leggere tutto. Cambia solo cosa può chiedere chi si
-- presenta senza sessione.

-- Si riparte da zero sul ruolo pubblico, poi si concede una colonna per volta.
REVOKE SELECT ON public.entita FROM anon;

GRANT SELECT (
  id, azienda_id, tipo, settore, slug, name, description,
  address, phone, email, schedule, whatsapp,
  logo_url, logo_dark_url, cover_url, gallery, theme, minisito,
  services, activities, excursions, menu, amenities, restaurant,
  checkin_time, checkout_time, rules,
  moduli, chatbot, active, plan, group_id, created_at, updated_at
) ON public.entita TO anon;

-- Fuori di proposito, e sono i campi per cui esiste questa migration:
--   wifi_password, wifi_name  → si vedono solo dentro l'app dell'ospite, che è
--                               servita dal server con la chiave di servizio
--   privacy_data              → contiene il codice fiscale del titolare; la
--                               pagina privacy la rende dal server, non dal browser
--   origine_tabella           → residuo tecnico della migrazione, non riguarda nessuno

-- ⚠️ Regola per il futuro: **ogni colonna nuova su `entita` nasce invisibile al
-- ruolo pubblico** e va concessa qui esplicitamente se serve. È l'opposto di
-- prima, dove una colonna nuova diventava pubblica da sola. La sonda
-- `tests/probe-rls-secondo-muro.mjs` verifica che resti così.
