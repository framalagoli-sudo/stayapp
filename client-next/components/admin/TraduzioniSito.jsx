'use client'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { Languages, RefreshCw } from 'lucide-react'

// Editor traduzioni inglesi (Fase 3 multilingua). Mostra IT → EN modificabile.
// I campi non toccati restano "automatici" (si ri-traducono se l'IT cambia);
// quelli modificati diventano override fissi (vincono sull'automatica).
export default function TraduzioniSito({ entityTipo, entityId }) {
  const [items, setItems]   = useState(null)
  const [values, setValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const d = await apiFetch(`/api/translations/${entityTipo}/${entityId}`)
      const its = d.items || []
      setItems(its)
      const v = {}
      for (const it of its) v[it.key] = it.override ?? it.auto ?? ''
      setValues(v)
    } catch (e) {
      setError(e.message || 'Errore caricamento')
    } finally { setLoading(false) }
  }

  useEffect(() => { if (entityId) load() }, [entityId, entityTipo])

  function buildOverrides() {
    // Override = solo i campi modificati rispetto all'automatica (e non vuoti).
    const out = {}
    for (const it of items) {
      const v = (values[it.key] ?? '').trim()
      if (v && v !== (it.auto || '')) out[it.key] = values[it.key]
    }
    return out
  }

  async function save(resetAuto = false) {
    setSaving(true); setSaved(false); setError('')
    try {
      await apiFetch(`/api/translations/${entityTipo}/${entityId}`, {
        method: 'PUT',
        body: JSON.stringify({ overrides: buildOverrides(), resetAuto }),
      })
      setSaved(true)
      if (resetAuto) await load()  // ricarica le automatiche rigenerate
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e.message || 'Errore salvataggio')
    } finally { setSaving(false) }
  }

  if (loading) return <p style={{ color: '#888', padding: '24px 0' }}>Caricamento traduzioni…</p>
  if (error && !items) return <p style={{ color: '#c53030', padding: '24px 0' }}>{error}</p>
  if (!items?.length) return (
    <p style={{ color: '#888', padding: '24px 0' }}>
      Nessun testo da tradurre per ora. Compila i contenuti del sito (descrizione, minisito) e torna qui.
    </p>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Languages size={18} strokeWidth={1.5} color="#1a1a2e" />
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Traduzioni inglesi</h3>
      </div>
      <p style={{ color: '#666', fontSize: 13, marginTop: 0, marginBottom: 20, lineHeight: 1.5 }}>
        Il sito in inglese è tradotto automaticamente. Qui puoi correggere i testi: quelli che modifichi
        restano fissi, gli altri continuano ad aggiornarsi da soli quando cambi l'italiano.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {items.map(it => {
          const edited = (values[it.key] ?? '') !== (it.auto || '') && (values[it.key] ?? '').trim() !== ''
          return (
            <div key={it.key} style={{ border: '1px solid #eee', borderRadius: 10, padding: 14, background: '#fff' }}>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, color: '#1a1a2e' }}>IT:</span> {it.source}
              </div>
              <textarea
                value={values[it.key] ?? ''}
                onChange={e => setValues(v => ({ ...v, [it.key]: e.target.value }))}
                rows={Math.min(4, Math.max(1, Math.ceil((values[it.key]?.length || 1) / 70)))}
                placeholder="Traduzione inglese…"
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: edited ? '#b45309' : '#16a34a' }}>
                  {edited ? '● Modificato (fisso)' : '○ Automatico'}
                </span>
                {edited && (
                  <button type="button" onClick={() => setValues(v => ({ ...v, [it.key]: it.auto || '' }))}
                    style={{ fontSize: 11, color: '#2b6cb0', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    ripristina automatica
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {error && <p style={{ color: '#c53030', fontSize: 13, marginTop: 12 }}>{error}</p>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
        <button type="button" onClick={() => save(false)} disabled={saving}
          style={{ padding: '11px 24px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Salvataggio…' : 'Salva traduzioni'}
        </button>
        {saved && <span style={{ color: '#16a34a', fontSize: 13, fontWeight: 600 }}>✓ Salvato</span>}
        <button type="button" onClick={() => save(true)} disabled={saving} title="Rigenera le traduzioni automatiche (mantiene le tue correzioni)"
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#f5f5f5', color: '#555', border: '1px solid #ddd', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer' }}>
          <RefreshCw size={14} strokeWidth={1.5} /> Rigenera automatiche
        </button>
      </div>
    </div>
  )
}
