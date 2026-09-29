'use client'
import { useState } from 'react'
import { SFONDI_APP, sfondoApp, paletteApp } from '@/lib/palette-app'

// La scelta dello sfondo dell'app del QR, uguale per i tre tipi di entità.
// Si salva nel tema ma la legge solo l'app: il sito non cambia.
export default function SfondoApp({ theme = {}, onSave }) {
  const [scelta, setScelta] = useState(sfondoApp(theme))
  const [errore, setErrore] = useState('')

  async function scegli(key) {
    if (key === scelta) return
    const prima = scelta
    setScelta(key); setErrore('')
    try { await onSave({ ...theme, appSfondo: key }) }
    catch (e) { setScelta(prima); setErrore(e?.message || 'Salvataggio non riuscito') }
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '20px 28px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 24 }}>
      <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e', marginBottom: 3 }}>Sfondo dell'app</div>
      <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5, marginBottom: 14 }}>
        Vale solo per l'app che si apre dal QR code: il sito resta com'è. Scritte e icone si adattano da sole per restare leggibili.
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {SFONDI_APP.map(({ key, label }) => {
          const p = paletteApp({ ...theme, appSfondo: key })
          const attiva = scelta === key
          return (
            <button key={key} type="button" onClick={() => scegli(key)} aria-pressed={attiva}
              style={{ flex: '1 1 140px', padding: 10, borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                border: `2px solid ${attiva ? '#1a1a2e' : '#e5e5e5'}`, background: '#fff' }}>
              <div style={{ background: p.bgColor, borderRadius: 6, padding: 8, marginBottom: 8, border: '1px solid #e5e5e5' }}>
                <div style={{ background: p.cardBg, borderRadius: 4, padding: '6px 8px', border: `1px solid ${p.borderColor}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: p.textColor }}>Aa</div>
                  <div style={{ width: 28, height: 6, borderRadius: 3, background: p.primary, marginTop: 4 }} />
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: attiva ? 700 : 500, color: '#1a1a2e' }}>{label}</div>
            </button>
          )
        })}
      </div>
      {errore && <div style={{ marginTop: 10, fontSize: 12, color: '#c53030' }}>{errore}</div>}
    </div>
  )
}
