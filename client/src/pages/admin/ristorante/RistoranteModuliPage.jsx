import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useRistorante } from '../../../hooks/useRistorante'

const DEFAULT_MODULES = {
  gallery:   true,
  allergens: true,
  info:      true,
}

const MODULE_CONFIG = [
  {
    key: 'info',
    label: 'Tab Informazioni',
    desc: 'Mostra la scheda Info con orari, contatti e indirizzo nella PWA.',
  },
  {
    key: 'gallery',
    label: 'Tab Galleria',
    desc: 'Mostra la tab Galleria foto nella PWA (visibile solo se ci sono foto caricate).',
  },
  {
    key: 'allergens',
    label: 'Badge Allergeni',
    desc: 'Mostra i badge degli allergeni su ogni piatto del menu.',
  },
]

export default function RistoranteModuliPage() {
  const { id } = useParams()
  const { ristorante, loading, save, saving, saved } = useRistorante(id)
  const [modules, setModules] = useState(DEFAULT_MODULES)

  useEffect(() => {
    if (ristorante) setModules({ ...DEFAULT_MODULES, ...(ristorante.modules || {}) })
  }, [ristorante])

  function toggle(key) {
    const updated = { ...modules, [key]: !modules[key] }
    setModules(updated)
    save({ modules: updated }).catch(() => {})
  }

  if (loading) return <p style={loadingStyle}>Caricamento…</p>
  if (!ristorante) return <p style={errorStyle}>Ristorante non trovato.</p>

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4 }}>
        <h2 style={titleStyle}>Moduli attivi</h2>
        {saved  && <span style={{ fontSize: 13, color: '#38a169', fontWeight: 600 }}>✓ Salvato</span>}
        {saving && <span style={{ fontSize: 13, color: '#888' }}>Salvataggio…</span>}
      </div>
      <p style={descStyle}>Attiva o disattiva le sezioni visibili ai clienti nella PWA del ristorante.</p>

      <div style={cardStyle}>
        {MODULE_CONFIG.map(({ key, label, desc }) => (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
            padding: '18px 0',
            borderBottom: '1px solid #f0f0f0',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>{desc}</div>
            </div>
            <button
              type="button"
              onClick={() => toggle(key)}
              style={{
                width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                background: modules[key] ? '#e63946' : '#ddd',
                position: 'relative', flexShrink: 0, transition: 'background 0.2s',
              }}
            >
              <span style={{
                position: 'absolute', top: 3,
                left: modules[key] ? 25 : 3,
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

const titleStyle   = { marginTop: 0, marginBottom: 4, fontSize: 22 }
const descStyle    = { margin: '0 0 24px', color: '#888', fontSize: 14 }
const cardStyle    = { background: '#fff', borderRadius: 12, padding: '0 28px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
const loadingStyle = { padding: 32, color: '#888' }
const errorStyle   = { padding: 32, color: '#e53e3e' }
