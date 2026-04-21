import { useProperty } from '../../../hooks/useProperty'
import ActivitiesSection from '../ActivitiesSection'

export default function PropertyActivitiesPage() {
  const { property, loading, save } = useProperty()

  if (loading) return <p style={loadingStyle}>Caricamento…</p>
  if (!property) return <p style={errorStyle}>Nessuna struttura associata al profilo.</p>

  return (
    <div style={{ maxWidth: 720 }}>
      <h2 style={titleStyle}>Attività</h2>
      <p style={descStyle}>Organizza le attività per categoria. Gli ospiti possono filtrarle per fascia età e prenotarle direttamente dall'app.</p>

      <div style={cardStyle}>
        <ActivitiesSection
          activities={property.activities || []}
          onChange={v => save({ activities: v }).catch(() => {})}
        />
      </div>
    </div>
  )
}

const titleStyle   = { marginTop: 0, marginBottom: 4, fontSize: 22 }
const descStyle    = { margin: '0 0 24px', color: '#888', fontSize: 14 }
const cardStyle    = { background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
const loadingStyle = { padding: 32, color: '#888' }
const errorStyle   = { padding: 32, color: '#e53e3e' }
