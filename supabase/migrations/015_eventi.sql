-- Tabella eventi (trasversale a tutte le entità)
CREATE TABLE IF NOT EXISTS eventi (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id   uuid NOT NULL REFERENCES aziende(id) ON DELETE CASCADE,
  entity_tipo  text CHECK (entity_tipo IN ('struttura', 'ristorante')),
  entity_id    uuid,
  slug         text UNIQUE NOT NULL,
  title        text NOT NULL,
  description  text,
  cover_url    text,
  date_start   timestamptz NOT NULL,
  date_end     timestamptz,
  location     text,
  price        numeric(10,2) DEFAULT 0,
  seats_total  integer,
  seats_booked integer DEFAULT 0,
  active       boolean DEFAULT true,
  published    boolean DEFAULT false,
  packages     jsonb DEFAULT '[]'::jsonb,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Prenotazioni eventi
CREATE TABLE IF NOT EXISTS event_bookings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          uuid NOT NULL REFERENCES eventi(id) ON DELETE CASCADE,
  user_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  package_id        text,
  guest_name        text NOT NULL,
  guest_email       text NOT NULL,
  guest_phone       text,
  seats             integer DEFAULT 1,
  total_amount      numeric(10,2) DEFAULT 0,
  status            text DEFAULT 'pending',
  payment_intent_id text,
  notes             text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE eventi ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_bookings ENABLE ROW LEVEL SECURITY;
