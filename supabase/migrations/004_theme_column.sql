ALTER TABLE properties
ADD COLUMN theme JSONB NOT NULL DEFAULT '{"primaryColor": "#00b5b5", "font": "inter"}';
