-- Tabella collegamenti: connessioni tra entità della stessa azienda
-- Permette di collegare strutture, ristoranti e future categorie tra loro
-- La relazione è simmetrica: A→B equivale a B→A in lettura

CREATE TABLE IF NOT EXISTS collegamenti (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id  uuid        NOT NULL REFERENCES aziende(id) ON DELETE CASCADE,
  from_tipo   text        NOT NULL,  -- 'struttura' | 'ristorante'
  from_id     uuid        NOT NULL,
  to_tipo     text        NOT NULL,
  to_id       uuid        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(from_tipo, from_id, to_tipo, to_id)
);

CREATE INDEX ON collegamenti(from_tipo, from_id);
CREATE INDEX ON collegamenti(to_tipo, to_id);
CREATE INDEX ON collegamenti(azienda_id);

ALTER TABLE collegamenti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collegamenti_select" ON collegamenti
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.role IN ('super_admin','admin','editor') OR p.azienda_id = collegamenti.azienda_id)
    )
  );
