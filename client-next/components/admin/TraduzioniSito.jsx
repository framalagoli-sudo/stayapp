'use client'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { Languages, RefreshCw } from 'lucide-react'

// Editor traduzioni inglesi (Fase 3 multilingua). Mostra IT → EN modificabile,
// con selettore: sito principale + ogni sotto-pagina.
// I campi non toccati restano "automatici" (si ri-traducono se l'IT cambia);
// quelli modificati diventano override fissi (vincono sull'automatica).
export default function TraduzioniSito({ entityTipo, entityId }) {
  const MAIN = { tipo: entityTipo, id: entityId, label: 'Sito principale' }
  const [targets, setTargets] = useState([MAIN])
  const [target, setTarget]   = useState({ tipo: entityTipo, id: entityId })
  const [items, setItems]   = useState(null)
  const [values, setValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')

  // Elenco pagine → target selezionabili (oltre al sito principale).
  useEffect(() => {
    if (!entityId) return
    apiFetch(`/api/pagine?entity_tipo=${entityTipo}&entity_id=${entityId}`)
      .then(pagine => {
        const extra = (Array.isArray(pagine) ? pagine : []).map(p => ({
          tipo: 'pagina', id: p.id, label: p.slug === '__home__' ? 'Home' : (p.titolo || 'Pagina'),
        }))
        setTargets([{ tipo: entityTipo, id: entityId, label: 'Sito principale' }, ...extra])
      })
      .catch(() => {})
  }, [entityTipo, entityId])

  async function load(t) {
    setLoading(true); setError(''); setSaved(false)
    try {
      const d = await apiFetch(`/api/translations/${t.tipo}/${t.id}`)
      const its = d.items || []
      setItems(its)
      const v = {}
      for (const it of its) v[it.key] = it.override ?? it.auto ?? ''
      setValues(v)
    } catch (e) {
      setError(e.message || 'Errore caricamento'); setItems([])
    } finally { setLoading(false) }
  }

  useEffect(() => { if (target.id) load(target) }, [target.tipo, target.id])

  function buildOverrides() {
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
      await apiFetch(`/api/translations/${target.tipo}/${target.id}`, {
        method: 'PUT',
        body: JSON.stringify({ overrides: buildOverrides(), resetAuto }),
      })
      setSaved(true)
      if (resetAuto) await load(target)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e.message || 'Errore salvataggio')
    } finally { setSaving(false) }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Languages size={18} strokeWidth={1.5} color="#1a1a2e" />
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Traduzioni inglesi</h3>
      </div>
      <p style={{ color: '#666', fontSize: 13, marginTop: 0, marginBottom: 16, lineHeight: 1.5 }}>
        Il sito in inglese è tradotto automaticamente. Qui puoi correggere i testi: quelli che modifichi
        restano fissi, gli altri continuano ad aggiornarsi da soli quando cambi l'italiano.
      </p>

      {targets.length > 1 && (
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Pagina</label>
          <select
            value={`${target.tipo}:${target.id}`}
            onChange={e => {
              const [tipo, id] = e.target.value.split(':')
              setTarget({ tipo, id })
            }}
            style={{ padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, minWidth: 240, background: '#fff' }}>
            {targets.map(t => <option key={`${t.tipo}:${t.id}`} value={`${t.tipo}:${t.id}`}>{t.label}</option>)}
          </select>
        </div>
      )}

      {loading ? <p style={{ color: '#888', padding: '12px 0' }}>Caricamento traduzioni…</p>
      : error && !items ? <p style={{ color: '#c53030', padding: '12px 0' }}>{error}</p>
      : !items?.length ? (
        <p style={{ color: '#888', padding: '12px 0' }}>
          Nessun testo da tradurre in questa pagina. Aggiungi contenuti e torna qui.
        </p>
      ) : (
        <>
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
        </>
      )}
    </div>
  )
}
