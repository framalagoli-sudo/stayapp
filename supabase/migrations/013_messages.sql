-- Tabella messaggi per chat ospite ↔ reception
CREATE TABLE IF NOT EXISTS messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  session_id  text        NOT NULL,   -- ID anonimo guest (localStorage)
  guest_name  text,                   -- nome opzionale lasciato dal guest
  sender      text        NOT NULL,   -- 'guest' | 'staff'
  body        text        NOT NULL,
  read_at     timestamptz,            -- NULL = non letto dal destinatario
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_property_session ON messages(property_id, session_id);
CREATE INDEX IF NOT EXISTS messages_property_created ON messages(property_id, created_at DESC);

-- RLS: il server usa service role key, bypassa tutto.
-- Il client non legge/scrive messages direttamente, passa sempre dal server.
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
