-- Converte request_type da enum a text per supportare valori liberi
-- (attività, escursione, ecc.) già inviati dal server con service role key

ALTER TABLE requests ALTER COLUMN type TYPE text;
DROP TYPE IF EXISTS request_type;
