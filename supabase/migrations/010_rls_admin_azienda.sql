-- Aggiorna le RLS policy di properties per includere admin_azienda
-- Permettono di vedere le strutture della propria azienda via client Supabase

DROP POLICY IF EXISTS "property access" ON properties;

CREATE POLICY "property access" ON properties
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (
          p.role = 'super_admin'
          OR p.role IN ('admin', 'editor')
          OR p.property_id = properties.id
          OR (p.role = 'admin_gruppo' AND p.group_id = properties.group_id)
          OR (p.role = 'admin_azienda' AND p.azienda_id = properties.azienda_id)
        )
    )
  );

DROP POLICY IF EXISTS "property update" ON properties;

CREATE POLICY "property update" ON properties
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (
          p.role = 'super_admin'
          OR p.role IN ('admin', 'editor')
          OR p.property_id = properties.id
          OR (p.role = 'admin_gruppo' AND p.group_id = properties.group_id)
          OR (p.role = 'admin_azienda' AND p.azienda_id = properties.azienda_id)
        )
    )
  );
