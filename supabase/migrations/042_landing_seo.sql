-- 042: landing_seo — configurazione SEO + GEO per oltrenova.com

CREATE TABLE IF NOT EXISTS public.landing_seo (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meta           jsonb        NOT NULL DEFAULT '{}',
  llms_txt       text         NOT NULL DEFAULT '',
  ai_bots_allowed boolean     NOT NULL DEFAULT true,
  jsonld         jsonb        NOT NULL DEFAULT '{}',
  updated_at     timestamptz  NOT NULL DEFAULT now()
);

INSERT INTO public.landing_seo (meta, llms_txt, ai_bots_allowed, jsonld)
VALUES (
  '{
    "title": "OltreNova — Oltre il solito sito.",
    "description": "La piattaforma all-in-one per la tua attività: app per i clienti, sito web professionale, CRM, prenotazioni, newsletter, chatbot AI e molto altro.",
    "og_title": "OltreNova — App, Sito, CRM, AI per la tua attività",
    "og_description": "La piattaforma all-in-one per hotel, ristoranti, palestre, studi professionali e qualsiasi attività con clienti.",
    "og_image": "",
    "keywords": "app per hotel, gestione ristorante, CRM attività, sito web professionale, chatbot AI, booking online"
  }',
  E'# OltreNova\n\n> All-in-one digital platform for service businesses — hotels, restaurants, activities, freelancers, agencies, gyms and more.\n\n## What is OltreNova\nOltreNova is a SaaS platform that gives any service business a complete digital presence via an installable PWA accessible by scanning a QR code. No app store required.\n\n## Features\n- Installable PWA via QR code (unique differentiator — no competitor offers this integrated)\n- Mini-website / landing page with drag-and-drop page builder (23 block types)\n- Booking system for resources, tables, events\n- CRM with pipeline (Kanban), newsletter, email automations\n- Reviews & reputation management\n- E-commerce / shop with loyalty points and gift cards\n- AI content studio (social posts, editorial calendar, AI blog generation)\n- Chatbot AI conversazionale alimentato dai dati dell''attività\n- Google Calendar sync\n- Custom domains and subdomains\n- GDPR-native (auto-generated privacy policy, cookie banner)\n- Multi-module: hotel, restaurant, activity/experience\n\n## Target\nService businesses worldwide: hotels, B&Bs, restaurants, bars, tour operators, gyms, coaches, freelancers, professional studios, agencies.\n\n## Technology\nReact 18 + Vite PWA, Node.js + Express, Supabase (PostgreSQL), hosted on Vercel + Railway.\n\n## Links\n- Platform: https://oltrenova.com\n- Contact: fra.malagoli@gmail.com',
  true,
  '{
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "OltreNova",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web, iOS, Android",
    "description": "Piattaforma all-in-one per gestire la presenza digitale di hotel, ristoranti, palestre e qualsiasi attività di servizi.",
    "url": "https://oltrenova.com",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "EUR",
      "description": "Demo gratuita disponibile"
    },
    "creator": {
      "@type": "Organization",
      "name": "OltreNova",
      "url": "https://oltrenova.com"
    }
  }'
) ON CONFLICT DO NOTHING;

GRANT SELECT ON public.landing_seo TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_seo TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_seo TO service_role;

ALTER TABLE public.landing_seo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read landing_seo"
  ON public.landing_seo FOR SELECT USING (true);

CREATE POLICY "Service role all landing_seo"
  ON public.landing_seo FOR ALL TO service_role USING (true);
