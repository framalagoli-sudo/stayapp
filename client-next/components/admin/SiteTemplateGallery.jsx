'use client'
import { useState } from 'react'
import { apiFetch } from '@/lib/api'
import { blockEmoji, blockLabel } from '@/lib/blockTypes'
import { SITE_TEMPLATES } from '@/lib/siteTemplates'

// Galleria template di sito (Fase A). Card con anteprima (tema + struttura blocchi)
// + "Applica" → crea la home dal template, poi si modifica nell'editor.
// Anteprima v1: rappresentazione fedele a colori/struttura (non live render).

function Preview({ tpl }) {
  const c = tpl.theme?.primaryColor || '#1a1a2e'
  const rows = tpl.blocks.slice(0, 6)
  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #eee', background: '#fff' }}>
      {/* finta barra browser */}
      <div style={{ height: 16, background: '#f2f2f4', display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px' }}>
        {['#ff5f56', '#ffbd2e', '#27c93f'].map(d => <span key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: d }} />)}
      </div>
      {/* hero */}
      <div style={{ height: 54, background: `linear-gradient(135deg, ${c} 0%, ${c}cc 100%)`, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 12px', gap: 4 }}>
        <div style={{ height: 8, width: '55%', borderRadius: 4, background: 'rgba(255,255,255,0.9)' }} />
        <div style={{ height: 5, width: '38%', borderRadius: 3, background: 'rgba(255,255,255,0.55)' }} />
      </div>
      {/* righe blocchi */}
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.slice(1).map((b, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#999' }}>
            <span style={{ fontSize: 11 }}>{blockEmoji(b.type)}</span>
            <span style={{ flex: 1, height: 4, borderRadius: 2, background: '#ececf0' }} />
            <span style={{ fontSize: 9, color: '#bbb', whiteSpace: 'nowrap' }}>{blockLabel(b.type)}</span>
          </div>
        ))}
      </div>
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
