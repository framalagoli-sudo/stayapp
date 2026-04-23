-- Aggiunge i ruoli interni per il team StayApp
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'editor';
