import { useProperty } from '../../../hooks/useProperty'
import PrivacySettingsSection from '../../../components/admin/PrivacySettingsSection'

export default function PropertyPrivacyPage() {
  const { property, loading, saving, saved, saveError, save } = useProperty()

  if (loading) return <p style={{ padding: 32, color: '#888' }}>Caricamento…</p>
  if (!property) return <p style={{ padding: 32, color: '#e53e3e' }}>Struttura non trovata.</p>

  return (
    <PrivacySettingsSection
      entityData={property}
      pwaSlug={property.slug}
      pwaPrefix="s"
      onSave={save}
      saving={saving}
      saved={saved}
      saveError={saveError}
    />
  )
}
