import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAttivita } from '../../../hooks/useAttivita'

const DEFAULT_HOME_SECTIONS = { servizi: true, galleria: true }
const DEFAULT_HOME_ORDER     = ['servizi', 'galleria']

const HOME_SECTION_LABELS = {
  servizi:  'Servizi',
  galleria: 'Galleria',
}

function ToggleSwitch({ on, onChange, primary = '#1a1a2e' }) {
  return (
    <button type="button" onClick={onChange} style={{
      width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
      background: on ? primary : '#ddd',
      position: 'relative', flexShrink: 0, transition: 'background 0.2s',
    }}>
      <span style={{
        position: 'absolute', top: 3,
        left: on ? 25 : 3,
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, marginTop: 4 }}>
      {children}
    </div>
  )
}

export default function AttivitaModuliPage() {
  const { id } = useParams()
  const { attivita, loading, save, saving, saved } = useAttivita(id)

  const [pwaActive,    setPwaActive]    = useState(true)
  const [homeSections, setHomeSections] = useState(DEFAULT_HOME_SECTIONS)
  const [homeOrder,    setHomeOrder]    = useState(DEFAULT_HOME_ORDER)

  useEffect(() => {
    if (!attivita) return
    const pwa = attivita.pwa || {}
    const mods = pwa.modules || {}
    setPwaActive(pwa.active !== false)
    setHomeSections({ ...DEFAULT_HOME_SECTIONS, ...(mods.home_sections || {}) })
    setHomeOrder(mods.home_section_order?.length ? mods.home_section_order : DEFAULT_HOME_ORDER)
  }, [attivita])

  function saveAll(patch) {
    const pwa = attivita?.pwa || {}
    const mods = pwa.modules || {}
    save({ pwa: { ...pwa, ...patch } }).catch(() => {})
  }

  function togglePwa() {
    const next = !pwaActive
    setPwaActive(next)
    saveAll({ active: next })
  }

  function toggleSection(key) {
    const next = { ...homeSections, [key]: !homeSections[key] }
    setHomeSections(next)
    const pwa = attivita?.pwa || {}
    const mods = pwa.modules || {}
    save({ pwa: { ...pwa, modules: { ...mods, home_sections: next, home_section_order: homeOrder } } }).catch(() => {})
  }

  function moveSection(idx, dir) {
    const next = [...homeOrder]
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= next.length) return
    ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
    setHomeOrder(next)
    const pwa = attivita?.pwa || {}
    const mods = pwa.modules || {}
    save({ pwa: { ...pwa, modules: { ...mods, home_sections: homeSections, home_section_order: next } } }).catch(() => {})
  }

  if (loading)   return <p style={{ padding: 32, color: '#888' }}>Caricamento…</p>
  if (!attivita) return <p style={{ padding: 32, color: '#e53e3e' }}>Attività non trovata.</p>

  const primary = attivita.theme?.primaryColor || '#1a1a2e'

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4 }}>
        <h2 style={{ marginTop: 0, marginBottom: 4, fontSize: 22 }}>App Clienti</h2>
        {saved  && <span style={{ fontSize: 13, color: '#38a169', fontWeight: 600 }}>✓ Salvato</span>}
        {saving && <span style={{ fontSize: 13, color: '#888' }}>Salvataggio…</span>}
      </div>
      <p style={{ margin: '0 0 24px', color: '#888', fontSize: 14 }}>
        Configura l'app QR dell'attività: attiva/disattiva sezioni e scegli l'ordine nella Home.
      </p>

      {/* App attiva */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '0 28px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '18px 0' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e', marginBottom: 3 }}>App Clienti attiva</div>
            <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>
              Abilita la PWA per l'attività. Se disattivata, il QR code mostra solo il sito web (se attivo) o una pagina offline.
            </div>
          </div>
          <ToggleSwitch on={pwaActive} onChange={togglePwa} primary={primary} />
        </div>
      </div>

      {/* Schede in evidenza Home */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '20px 28px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <SectionTitle>Schede in evidenza (Home)</SectionTitle>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: '#aaa', lineHeight: 1.5 }}>
          Scegli quali schede mostrare nella Home dell'app e in che ordine.
        </p>

        {homeOrder.map((key, idx) => (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            padding: '14px 0', borderBottom: idx < homeOrder.length - 1 ? '1px solid #f0f0f0' : 'none',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>{HOME_SECTION_LABELS[key] || key}</span>
              {!homeSections[key] && <span style={{ fontSize: 11, color: '#aaa' }}>Nascosta</span>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button type="button" onClick={() => moveSection(idx, -1)} disabled={idx === 0}
                  style={{ border: 'none', background: '#f5f5f5', borderRadius: 4, width: 26, height: 22, cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1, fontSize: 11 }}>▲</button>
                <button type="button" onClick={() => moveSection(idx, 1)} disabled={idx === homeOrder.length - 1}
                  style={{ border: 'none', background: '#f5f5f5', borderRadius: 4, width: 26, height: 22, cursor: idx === homeOrder.length - 1 ? 'default' : 'pointer', opacity: idx === homeOrder.length - 1 ? 0.3 : 1, fontSize: 11 }}>▼</button>
              </div>
              <ToggleSwitch on={homeSections[key] !== false} onChange={() => toggleSection(key)} primary={primary} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
