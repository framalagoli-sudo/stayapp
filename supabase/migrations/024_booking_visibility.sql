-- 024_booking_visibility.sql
-- Aggiunge visibile_minisito su risorse:
-- true  → appare nel widget pubblico del minisito
-- false → gestibile in admin ma non esposta al pubblico

ALTER TABLE risorse
  ADD COLUMN IF NOT EXISTS visibile_minisito boolean NOT NULL DEFAULT true;
