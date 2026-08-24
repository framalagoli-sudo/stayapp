-- PASSO 1 dell'unificazione: la tabella `entita`.
--
-- Perché. OltreNova è nata come app per hotel; ristoranti e attività sono
-- arrivati dopo, ereditando solo una parte dei campi. Il risultato misurato il
-- 24/08/2026: 20 campi comuni e 17 disponibili solo ad alcuni. In concreto un
-- hotel con ristorante interno non poteva avere un menù, un ristorante non
-- poteva elencare i propri servizi, un hotel non poteva dichiarare gli orari
-- (ed è il motivo per cui il chatbot rispondeva "Entità non trovata"), e
-- `whatsapp` — che è uno dei pezzi forti del prodotto — esisteva solo sugli
-- hotel. L'all-in-one era nella visione, non nei dati.
--
-- Il modello scelto (deciso con Francesco, ispirato a GoHighLevel): **il tipo
-- non limita nulla**. Serve a scegliere il preset iniziale — quali moduli
-- accendere, che etichette usare, che template proporre — non a decidere cosa
-- un cliente può fare. Un hotel accende il menù, una palestra i servizi, un
-- avvocato solo sito e contatti.
--
-- ⚠️ QUESTO PASSO NON CAMBIA NIENTE. La tabella nasce vuota, viene riempita con
-- una copia dei dati e nessuno la usa ancora: `properties`, `ristoranti` e
-- `attivita` restano intatte e il prodotto continua a girare esattamente come
-- prima. Serve ad avere la struttura pronta e verificabile prima del passo
-- delicato (le tre tabelle che diventano viste su questa).
--
-- Verificato prima di scrivere: 13 entità in tutto, slug tutti distinti fra le
-- tre tabelle, id tutti distinti. Nessun conflitto da risolvere.

CREATE TABLE IF NOT EXISTS public.entita (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id     uuid REFERENCES public.aziende(id) ON DELETE CASCADE,
  -- Preset di partenza, non un recinto. Testo libero e non enum proprio perché
  -- domani ci saranno palestre, studi legali, officine: aggiungerne uno non
  -- deve richiedere una migration.
  tipo           text NOT NULL DEFAULT 'attivita',
  slug           text NOT NULL UNIQUE,
  name           text NOT NULL,

  -- ── anagrafica, comune a tutti ───────────────────────────────────────────
  description    text,
  address        text,
  phone          text,
  email          text,
  schedule       text,          -- mancava agli hotel: da qui il chatbot muto
  whatsapp       text,          -- c'era solo sugli hotel

  -- ── immagini e aspetto ───────────────────────────────────────────────────
  logo_url       text,
  logo_dark_url  text,
  cover_url      text,
  gallery        jsonb DEFAULT '[]'::jsonb,
  theme          jsonb,
  minisito       jsonb,

  -- ── contenuti, ora di tutti ──────────────────────────────────────────────
  services       jsonb DEFAULT '[]'::jsonb,   -- non l'avevano i ristoranti
  activities     jsonb DEFAULT '[]'::jsonb,   -- solo hotel
  excursions     jsonb DEFAULT '[]'::jsonb,   -- solo hotel
  menu           jsonb DEFAULT '[]'::jsonb,   -- solo ristoranti
  amenities      jsonb DEFAULT '[]'::jsonb,   -- solo hotel
  restaurant     jsonb,                        -- solo hotel

  -- ── specifici dell'ospitalità: restano, semplicemente non sono più esclusivi
  wifi_name      text,
  wifi_password  text,
  checkin_time   text,
  checkout_time  text,
  rules          text,

  -- ── configurazione ───────────────────────────────────────────────────────
  -- `moduli` unifica `modules` (hotel, ristoranti) e `pwa` (attività): erano due
  -- nomi per la stessa cosa, cioè quali sezioni mostrare nell'app ospite.
  moduli         jsonb DEFAULT '{}'::jsonb,
  chatbot        jsonb,
  privacy_data   jsonb DEFAULT '{}'::jsonb,
  plan           text DEFAULT 'base',
  group_id       uuid,

  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  -- Da dove viene questa riga: serve durante la transizione per riconciliare
  -- e, se qualcosa andasse storto, per tornare indietro sapendo cosa era cosa.
  origine_tabella text
);

CREATE INDEX IF NOT EXISTS entita_azienda_idx ON public.entita (azienda_id);
CREATE INDEX IF NOT EXISTS entita_tipo_idx    ON public.entita (tipo);
CREATE INDEX IF NOT EXISTS entita_slug_idx    ON public.entita (slug);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entita TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entita TO service_role;
GRANT SELECT ON public.entita TO anon;   -- i siti pubblici sono in sola lettura
ALTER TABLE public.entita ENABLE ROW LEVEL SECURITY;

-- Le pagine pubbliche leggono le entità attive senza autenticazione, come oggi
-- fanno sulle tre tabelle di partenza.
DROP POLICY IF EXISTS "entita pubbliche in lettura" ON public.entita;
CREATE POLICY "entita pubbliche in lettura" ON public.entita
  FOR SELECT TO anon USING (active = true);

-- Chi è autenticato vede le entità della propria azienda. La scrittura resta
-- alle route, che passano dalla service_role e applicano i propri controlli.
DROP POLICY IF EXISTS "entita della propria azienda" ON public.entita;
CREATE POLICY "entita della propria azienda" ON public.entita
  FOR SELECT TO authenticated
  USING (azienda_id IN (SELECT azienda_id FROM public.profiles WHERE id = auth.uid()));

-- ── Copia dei dati ─────────────────────────────────────────────────────────
-- Gli id restano gli stessi: tutto ciò che punta a un'entità (pagine, eventi,
-- domini, prenotazioni…) continua a puntare alla stessa cosa.

INSERT INTO public.entita (
  id, azienda_id, tipo, slug, name, description, address, phone, email, schedule, whatsapp,
  logo_url, logo_dark_url, cover_url, gallery, theme, minisito,
  services, activities, excursions, amenities, restaurant,
  wifi_name, wifi_password, checkin_time, checkout_time, rules,
  moduli, chatbot, privacy_data, plan, group_id, active, created_at, updated_at, origine_tabella
)
SELECT
  id, azienda_id, 'struttura', slug, name, description, address, phone, email, NULL, whatsapp,
  logo_url, logo_dark_url, cover_url, gallery, theme, minisito,
  services, activities, excursions, amenities, restaurant,
  wifi_name, wifi_password, checkin_time, checkout_time, rules,
  COALESCE(modules, '{}'::jsonb), chatbot, privacy_data, plan::text, group_id, active, created_at, updated_at, 'properties'
FROM public.properties
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.entita (
  id, azienda_id, tipo, slug, name, description, address, phone, email, schedule,
  logo_url, logo_dark_url, cover_url, gallery, theme, minisito, menu,
  moduli, chatbot, privacy_data, active, created_at, updated_at, origine_tabella
)
SELECT
  id, azienda_id, 'ristorante', slug, name, description, address, phone, email, schedule,
  logo_url, logo_dark_url, cover_url, gallery, theme, minisito, menu,
  COALESCE(modules, '{}'::jsonb), chatbot, privacy_data, active, created_at, updated_at, 'ristoranti'
FROM public.ristoranti
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.entita (
  id, azienda_id, tipo, slug, name, description, address, phone, email, schedule,
  logo_url, logo_dark_url, cover_url, gallery, theme, minisito, services,
  moduli, chatbot, privacy_data, active, created_at, updated_at, origine_tabella
)
SELECT
  id, azienda_id, COALESCE(NULLIF(tipo, ''), 'attivita'), slug, name, description, address, phone, email, schedule,
  logo_url, logo_dark_url, cover_url, gallery, theme, minisito, services,
  COALESCE(pwa, '{}'::jsonb), chatbot, privacy_data, active, created_at, updated_at, 'attivita'
FROM public.attivita
ON CONFLICT (id) DO NOTHING;
