import { useState } from 'react'
import { useProperty } from '../../../hooks/useProperty'

const MODULE_DEFS = [
  { key: 'info',         label: 'Informazioni struttura',  desc: "Tab Info nell'app ospite" },
  { key: 'wifi',         label: 'WiFi',                    desc: 'Tab WiFi con credenziali' },
  { key: 'reception',    label: 'Richieste alla reception', desc: "Tab Richiesta nell'app ospite" },
  { key: 'housekeeping', label: 'Housekeeping / Pulizie',  desc: 'Richieste di pulizia camera' },
]

const DEFAULT_MODULES = {
  reception: true, housekeeping: false, restaurant: false,
  upselling: false, chat: false, wifi: true, info: true,
}

export default function PropertyModulesPage() {
  const { property, setProperty, loading, propertyId, save } = useProperty()
  const [toggling, setToggling] = useState(null)

  if (loading) return <p style={loadingStyle}>Caricamento…</p>
  if (!property) return <p style={errorStyle}>Nessuna struttura associata al profilo.</p>

  const modules = { ...DEFAULT_MODULES, ...(property.modules || {}) }

  async function toggle(key) {
    const newModules = { ...modules, [key]: !modules[key] }
    setProperty(p => ({ ...p, modules: newModules }))
    setToggling(key)
    try {
      await save({ modules: newModules })
    } catch (e) {
      setProperty(p => ({ ...p, modules: modules }))
      alert(`Errore: ${e.message}`)
    } finally {
      setToggling(null)
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h2 style={titleStyle}>Moduli attivi</h2>
      <p style={descStyle}>Attiva o disattiva le funzionalità visibili agli ospiti nell'app.</p>

      <div style={cardStyle}>
        {MODULE_DEFS.map(({ key, label, desc }, i) => {
          const isOn = modules[key]
          const isToggling = toggling === key
          return (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 0',
              borderBottom: i < MODULE_DEFS.length - 1 ? '1px solid #f0f0f0' : 'none',
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#222' }}>{label}</div>
                <div style={{ fontSize: 13, color: '#aaa', marginTop: 3 }}>{desc}</div>
              </div>
              <button
                onClick={() => !isToggling && toggle(key)}
                disabled={isToggling}
                style={{
                  width: 48, height: 26, borderRadius: 13, border: 'none', padding: 0,
                  background: isOn ? '#1a1a2e' : '#ddd',
                  position: 'relative', cursor: isToggling ? 'default' : 'pointer',
                  flexShrink: 0, transition: 'background 0.2s', opacity: isToggling ? 0.6 : 1,
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, left: isOn ? 24 : 3,
                  width: 20, height: 20, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s', display: 'block',
                }} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}


const titleStyle   = { marginTop: 0, marginBottom: 4, fontSize: 22 }
const descStyle    = { margin: '0 0 24px', color: '#888', fontSize: 14 }
const cardStyle    = { background: '#fff', borderRadius: 12, padding: '8px 28px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
const loadingStyle = { padding: 32, color: '#888' }
const errorStyle   = { padding: 32, color: '#e53e3e' }
