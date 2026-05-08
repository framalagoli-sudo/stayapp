CREATE TABLE IF NOT EXISTS page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_tipo text NOT NULL,
  entity_id uuid NOT NULL,
  viewed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_views_entity ON page_views(entity_tipo, entity_id);
CREATE INDEX IF NOT EXISTS idx_page_views_date   ON page_views(viewed_at);
