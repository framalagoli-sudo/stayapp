import { useParams } from 'react-router-dom'
import { useAttivita } from '../../../hooks/useAttivita'
import PrivacySettingsSection from '../../../components/admin/PrivacySettingsSection'

export default function AttivitaPrivacyPage() {
  const { id } = useParams()
  const { attivita, loading, saving, saved, saveError, save } = useAttivita(id)

  if (loading) return <p style={{ padding: 32, color: '#888' }}>Caricamento…</p>
  if (!attivita) return <p style={{ padding: 32, color: '#e53e3e' }}>Attività non trovata.</p>

  return (
    <PrivacySettingsSection
      entityData={attivita}
      pwaSlug={attivita.slug}
      pwaPrefix="a"
      onSave={save}
      saving={saving}
      saved={saved}
      saveError={saveError}
    />
  )
}
