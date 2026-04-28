import { useParams } from 'react-router-dom'
import { useRistorante } from '../../../hooks/useRistorante'
import PrivacySettingsSection from '../../../components/admin/PrivacySettingsSection'

export default function RistorantePrivacyPage() {
  const { id } = useParams()
  const { ristorante, loading, saving, saved, saveError, save } = useRistorante(id)

  if (loading) return <p style={{ padding: 32, color: '#888' }}>Caricamento…</p>
  if (!ristorante) return <p style={{ padding: 32, color: '#e53e3e' }}>Ristorante non trovato.</p>

  return (
    <PrivacySettingsSection
      entityData={ristorante}
      pwaSlug={ristorante.slug}
      pwaPrefix="r"
      onSave={save}
      saving={saving}
      saved={saved}
      saveError={saveError}
    />
  )
}
