'use client'
import { useState } from 'react'
import { apiFetch } from '@/lib/api'
import { SITE_TEMPLATES } from '@/lib/siteTemplates'

// Galleria template di sito. Card con ANTEPRIMA REALE (render del template in iframe
// scalato) + "Applica" → crea la home dal template, poi si modifica nell'editor.

// L'iframe renderizza il sito a larghezza piena e lo riduciamo in scala: si vede
// il template "vero" (hero, sezioni, colori, font), non un'astrazione.
function Preview({ tpl }) {
  const W = 1180          // larghezza logica del render
  const scale = 0.235     // riduzione → ~277px, ritagliata dal contenitore
  return (
    <div style={{ position: 'relative', width: '100%', height: 190, overflow: 'hidden', borderRadius: 10, border: '1px solid #eee', background: '#fff' }}>
      <iframe
        src={`/template-preview/${tpl.id}`}
        title={tpl.nome}
        loading="lazy"
        scrolling="no"
        style={{ width: W, height: W * 1.3, border: 0, transform: `scale(${scale})`, transformOrigin: 'top left', pointerEvents: 'none' }}
      />
    </div>
  )
}

export default function SiteTemplateGallery({ entityTipo, entityId, onApplied }) {
  const [applyingId, setApplyingId] = useState(null)
  const [confirmId, setConfirmId]   = useState(null)
  const [error, setError]           = useState('')

  async function apply(id) {
    setApplyingId(id); setError('')
    try {
      await apiFetch('/api/site-templates/apply', {
        method: 'POST',
        body: JSON.stringify({ entity_tipo: entityTipo, entity_id: entityId, template_id: id }),
      })
      setConfirmId(null)
      onApplied?.()
    } catch (e) {
      setError(e.message || 'Errore applicazione template')
    } finally { setApplyingId(null) }
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>Parti da un template</h3>
      <p style={{ color: '#666', fontSize: 13, marginTop: 0, marginBottom: 8 }}>
        Scegli un layout pronto: crea la home con struttura e stile, poi modifichi testi e immagini nell'editor. ⚠️ Sostituisce la home attuale.
      </p>
      {error && <p style={{ color: '#c53030', fontSize: 13 }}>{error}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16, marginTop: 12 }}>
        {SITE_TEMPLATES.map(tpl => (
          <div key={tpl.id} style={{ border: '1px solid #eee', borderRadius: 12, padding: 12, background: '#fff', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Preview tpl={tpl} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{tpl.nome}</div>
              <div style={{ fontSize: 12, color: '#888', lineHeight: 1.4, marginTop: 2 }}>{tpl.descrizione}</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {tpl.settori.slice(0, 3).map(s => (
                <span key={s} style={{ fontSize: 10, color: '#666', background: '#f3f3f6', padding: '2px 8px', borderRadius: 20 }}>{s}</span>
              ))}
            </div>
            {confirmId === tpl.id ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => apply(tpl.id)} disabled={applyingId === tpl.id}
                  style={{ flex: 1, padding: '9px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  {applyingId === tpl.id ? 'Applico…' : 'Conferma'}
                </button>
                <button onClick={() => setConfirmId(null)} disabled={applyingId === tpl.id}
                  style={{ padding: '9px 12px', background: '#f5f5f5', color: '#555', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                  Annulla
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmId(tpl.id)}
                style={{ padding: '9px', background: '#fff', color: '#1a1a2e', border: '1.5px solid #1a1a2e', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Usa questo template
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
