import { useState } from 'react'
import { useProperty } from '../../../hooks/useProperty'

const NAV_MODULE_DEFS = [
  { key: 'info',         label: 'Tab Informazioni',        desc: "Tab Info nell'app — orari, WiFi, indirizzo" },
  { key: 'reception',    label: 'Tab Richieste',           desc: "Tab Richiesta nell'app — messaggi e richieste ospiti" },
  { key: 'wifi',         label: 'WiFi in evidenza',        desc: 'Mostra le credenziali WiFi nella tab Info' },
  { key: 'housekeeping', label: 'Richieste housekeeping',  desc: 'Permette agli ospiti di richiedere pulizie camera' },
  { key: 'chat',         label: 'Chat con la reception',   desc: 'Tab Chat — messaggistica realtime con gli ospiti' },
]

const HOME_SECTION_DEFS = [
  { key: 'galleria',   label: 'Galleria',    desc: 'Scheda con le foto della struttura' },
  { key: 'servizi',    label: 'Servizi',     desc: 'Scheda con i servizi disponibili' },
  { key: 'attivita',   label: 'Attività',    desc: 'Scheda attività prenotabili' },
  { key: 'escursioni', label: 'Escursioni',  desc: 'Scheda escursioni disponibili' },
  { key: 'eventi',     label: 'Eventi',      desc: 'Scheda prossimi eventi' },
]

const DEFAULT_MODULES = {
  reception: true, housekeeping: false, chat: false, wifi: true, info: true,
  home_sections: { galleria: true, servizi: true, attivita: true, escursioni: true, eventi: true },
  home_section_order: ['galleria', 'servizi', 'attivita', 'escursioni', 'eventi'],
}

export default function PropertyModulesPage() {
  const { property, setProperty, loading, save } = useProperty()
  const [toggling, setToggling] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  if (loading) return <p style={loadingStyle}>Caricamento…</p>
  if (!property) return <p style={errorStyle}>Nessuna struttura associata al profilo.</p>

  const modules = { ...DEFAULT_MODULES, ...(property.modules || {}), }
  const homeSections = { ...DEFAULT_MODULES.home_sections, ...(modules.home_sections || {}) }
  const homeOrder = (modules.home_section_order?.length ? modules.home_section_order : DEFAULT_MODULES.home_section_order)
    .filter(k => HOME_SECTION_DEFS.some(d => d.key === k))

  async function patchModules(updated) {
    setProperty(p => ({ ...p, modules: updated }))
    setSaving(true); setSaved(false)
    try {
      await save({ modules: updated })
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setProperty(p => ({ ...p, modules: modules }))
      alert(`Errore: ${e.message}`)
    } finally { setSaving(false) }
  }

  async function toggleNav(key) {
    if (toggling) return
    setToggling(key)
    await patchModules({ ...modules, [key]: !modules[key] })
    setToggling(null)
  }

  async function toggleSection(key) {
    const updated = { ...homeSections, [key]: !homeSections[key] }
    await patchModules({ ...modules, home_sections: updated })
  }

  async function moveSection(idx, dir) {
    const order = [...homeOrder]
    const target = idx + dir
    if (target < 0 || target >= order.length) return
    ;[order[idx], order[target]] = [order[target], order[idx]]
    await patchModules({ ...modules, home_section_order: order })
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4 }}>
        <h2 style={titleStyle}>App Clienti</h2>
        {saved  && <span style={{ fontSize: 13, color: '#38a169', fontWeight: 600 }}>✓ Salvato</span>}
        {saving && <span style={{ fontSize: 13, color: '#888' }}>Salvataggio…</span>}
      </div>
      <p style={descStyle}>Configura le sezioni e le funzionalità visibili ai clienti nell'app QR.</p>

      {/* ── Navigazione ── */}
      <SectionTitle>Navigazione — Tab</SectionTitle>
      <div style={cardStyle}>
        {NAV_MODULE_DEFS.map(({ key, label, desc }, i) => {
          const isOn = modules[key]
          const isToggling = toggling === key
          return (
            <ToggleRow key={key} label={label} desc={desc} isOn={isOn}
              isLast={i === NAV_MODULE_DEFS.length - 1}
              disabled={isToggling || saving}
              onToggle={() => toggleNav(key)} />
          )
        })}
      </div>

      {/* ── Schede Home ── */}
      <SectionTitle style={{ marginTop: 28 }}>Schede in evidenza (Home)</SectionTitle>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
        Scegli quali schede mostrare nella Home dell'app e in che ordine appaiono.
      </p>
      <div style={cardStyle}>
        {homeOrder.map((key, idx) => {
          const def = HOME_SECTION_DEFS.find(d => d.key === key)
          if (!def) return null
          const isOn = homeSections[key] !== false
          return (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 0',
              borderBottom: idx < homeOrder.length - 1 ? '1px solid #f0f0f0' : 'none',
            }}>
              {/* Riordina */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                <button onClick={() => moveSection(idx, -1)} disabled={idx === 0 || saving}
                  style={arrowBtn(idx === 0)}>▲</button>
                <button onClick={() => moveSection(idx, 1)} disabled={idx === homeOrder.length - 1 || saving}
                  style={arrowBtn(idx === homeOrder.length - 1)}>▼</button>
              </div>
              {/* Drag handle visual */}
              <div style={{ width: 3, height: 28, borderRadius: 2, background: isOn ? '#1a1a2e' : '#ddd', flexShrink: 0 }} />
              {/* Label */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: isOn ? '#1a1a2e' : '#aaa' }}>{def.label}</div>
                <div style={{ fontSize: 12, color: '#bbb', marginTop: 2 }}>{def.desc}</div>
              </div>
              {/* Toggle */}
              <ToggleSwitch isOn={isOn} disabled={saving} onToggle={() => toggleSection(key)} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SectionTitle({ children, style: extra }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, ...extra }}>
      {children}
    </div>
  )
}

function ToggleRow({ label, desc, isOn, onToggle, disabled, isLast }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 0',
      borderBottom: isLast ? 'none' : '1px solid #f0f0f0',
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#222' }}>{label}</div>
        <div style={{ fontSize: 12, color: '#aaa', marginTop: 3 }}>{desc}</div>
      </div>
      <ToggleSwitch isOn={isOn} disabled={disabled} onToggle={onToggle} />
    </div>
  )
}

function ToggleSwitch({ isOn, onToggle, disabled }) {
  return (
    <button type="button" onClick={onToggle} disabled={disabled}
      style={{
        width: 48, height: 26, borderRadius: 13, border: 'none', padding: 0,
        background: isOn ? '#1a1a2e' : '#ddd',
        position: 'relative', cursor: disabled ? 'default' : 'pointer',
        flexShrink: 0, transition: 'background 0.2s', opacity: disabled ? 0.6 : 1,
      }}>
      <span style={{
        position: 'absolute', top: 3, left: isOn ? 24 : 3,
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', display: 'block',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

function arrowBtn(disabled) {
  return {
    width: 20, height: 18, background: disabled ? '#f5f5f5' : '#f0f0f0',
    border: '1px solid #e0e0e0', borderRadius: 4,
    cursor: disabled ? 'default' : 'pointer',
    fontSize: 9, color: disabled ? '#ccc' : '#555',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
  }
}

const titleStyle   = { marginTop: 0, marginBottom: 4, fontSize: 22 }
const descStyle    = { margin: '0 0 24px', color: '#888', fontSize: 14 }
const cardStyle    = { background: '#fff', borderRadius: 12, padding: '0px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 8 }
const loadingStyle = { padding: 32, color: '#888' }
const errorStyle   = { padding: 32, color: '#e53e3e' }
