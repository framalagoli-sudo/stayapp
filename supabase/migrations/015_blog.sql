-- Blog categories (per azienda)
CREATE TABLE IF NOT EXISTS blog_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id  uuid REFERENCES aziende(id) ON DELETE CASCADE,
  name        text NOT NULL,
  slug        text NOT NULL,
  description text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(azienda_id, slug)
);

-- Articoli
CREATE TABLE IF NOT EXISTS articoli (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id   uuid REFERENCES aziende(id) ON DELETE CASCADE,
  category_id  uuid REFERENCES blog_categories(id) ON DELETE SET NULL,
  entity_tipo  text,   -- 'struttura' | 'ristorante' | NULL (aziendale)
  entity_id    uuid,
  slug         text UNIQUE NOT NULL,
  title        text NOT NULL,
  excerpt      text,
  content      text,   -- HTML da editor rich text
  cover_url    text,
  author       text,
  published    boolean DEFAULT false,
  published_at timestamptz,
  active       boolean DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
