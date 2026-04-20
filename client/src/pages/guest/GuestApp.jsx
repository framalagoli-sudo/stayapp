import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import RequestForm from './RequestForm'

const DEFAULT_MODULES = {
  reception: true, housekeeping: false, restaurant: false,
  upselling: false, chat: false, wifi: true, info: true,
}

export default function GuestApp() {
  const { slug } = useParams()
  const [property, setProperty] = useState(null)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState(null)

  useEffect(() => {
    fetch(`/api/guest/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setProperty)
      .catch(() => setError('Struttura non trovata.'))
  }, [slug])

  // Imposta il tab di default al primo tab attivo
  useEffect(() => {
    if (!property) return
    const m = { ...DEFAULT_MODULES, ...(property.modules || {}) }
    const hasRequests = m.reception || m.housekeeping
    if (m.info)      { setTab('info');    return }
    if (m.wifi)      { setTab('wifi');    return }
    if (hasRequests) { setTab('request'); return }
  }, [property])

  if (error) return <div style={{ padding: 32, textAlign: 'center', color: '#e53e3e' }}>{error}</div>
  if (!property) return <div style={{ padding: 32, textAlign: 'center', color: '#888' }}>Caricamento…</div>

  const modules = { ...DEFAULT_MODULES, ...(property.modules || {}) }

  const hasRequests = modules.reception || modules.housekeeping

  const allTabs = [
    { key: 'info',    label: 'Info',      visible: modules.info },
    { key: 'wifi',    label: 'WiFi',      visible: modules.wifi },
    { key: 'request', label: 'Richiesta', visible: hasRequests },
  ]
  const visibleTabs = allTabs.filter(t => t.visible)

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', fontFamily: 'system-ui, sans-serif', background: '#fff', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: '#1a1a2e', color: '#fff', padding: '24px 20px 16px' }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>{property.name}</h1>
        {property.address && <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.7 }}>{property.address}</p>}
      </div>

      {/* Tabs */}
      {visibleTabs.length > 1 && (
        <div style={{ display: 'flex', borderBottom: '1px solid #eee', background: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
          {visibleTabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1, padding: '14px 0', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: tab === key ? 700 : 400,
                color: tab === key ? '#1a1a2e' : '#888',
                borderBottom: tab === key ? '2px solid #1a1a2e' : '2px solid transparent',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div style={{ padding: '20px' }}>
        {visibleTabs.length === 0
          ? <p style={{ textAlign: 'center', color: '#888', marginTop: 32 }}>Nessun servizio disponibile al momento.</p>
          : <>
              {tab === 'info'    && <InfoTab property={property} />}
              {tab === 'wifi'    && <WifiTab property={property} />}
              {tab === 'request' && <RequestForm propertyId={property.id} modules={modules} />}
            </>
        }
      </div>
    </div>
  )
}

function InfoTab({ property }) {
  return (
    <div>
      {property.description && <p style={{ color: '#555', lineHeight: 1.6 }}>{property.description}</p>}
      <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        {property.checkin_time  && <InfoRow label="Check-in"  value={property.checkin_time} />}
        {property.checkout_time && <InfoRow label="Check-out" value={property.checkout_time} />}
        {property.phone && (
          <InfoRow label="Telefono" value={<a href={`tel:${property.phone}`} style={{ color: '#1a1a2e' }}>{property.phone}</a>} />
        )}
      </div>
      {property.rules && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>Regole della struttura</h3>
          <p style={{ color: '#555', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{property.rules}</p>
        </div>
      )}
    </div>
  )
}

function WifiTab({ property }) {
  const [copied, setCopied] = useState(false)

  function copyPassword() {
    navigator.clipboard.writeText(property.wifi_password || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <h3 style={{ fontSize: 15, marginTop: 0 }}>Connessione WiFi</h3>
      {property.wifi_name ? (
        <div style={{ background: '#f5f5f5', borderRadius: 12, padding: 20 }}>
          <InfoRow label="Rete" value={property.wifi_name} />
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>Password</div>
              <div style={{ fontWeight: 600, letterSpacing: 1 }}>{property.wifi_password}</div>
            </div>
            <button
              onClick={copyPassword}
              style={{ padding: '8px 16px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
            >
              {copied ? 'Copiata!' : 'Copia'}
            </button>
          </div>
        </div>
      ) : (
        <p style={{ color: '#888' }}>Informazioni WiFi non disponibili.</p>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontWeight: 600, marginTop: 2 }}>{value}</div>
    </div>
  )
}
