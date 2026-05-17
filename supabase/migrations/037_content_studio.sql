-- Sprint: Content Studio strategico
-- Salva la strategia editoriale AI per azienda

ALTER TABLE aziende ADD COLUMN IF NOT EXISTS content_strategy jsonb DEFAULT '{}';
