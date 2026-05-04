-- Richieste demo dalla landing page StayApp
CREATE TABLE IF NOT EXISTS demo_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          text NOT NULL,
  email         text NOT NULL,
  telefono      text,
  tipo_attivita text,
  messaggio     text,
  letto         boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);
