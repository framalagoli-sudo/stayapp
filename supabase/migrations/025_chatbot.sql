-- 025_chatbot.sql
-- Aggiunge chatbot jsonb su properties, ristoranti, attivita
-- Struttura: { active, bot_name, nodes: [{ id, name, message, options: [{ id, label, type, next, value }] }] }

ALTER TABLE properties ADD COLUMN IF NOT EXISTS chatbot jsonb DEFAULT NULL;
ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS chatbot jsonb DEFAULT NULL;
ALTER TABLE attivita   ADD COLUMN IF NOT EXISTS chatbot jsonb DEFAULT NULL;
