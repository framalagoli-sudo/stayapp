'use client'
import { useState, useRef, useEffect } from 'react'
import { Link2, ChevronDown } from 'lucide-react'

// Costruisce le destinazioni interne selezionabili per un'entità: Home, pagine CMS
// pubblicate, Privacy, Cookie. Gli URL sono path piani /{prefix}/{slug}/... coerenti
// con come il sito pubblico linka internamente (LandingBlockRenderer). Vuoto finché
// lo slug dell'entità non è noto.
export function buildInternalLinks({ tipo, slug, pages }) {
  if (!slug) return []
  const prefix = tipo === 'struttura' ? 's' : tipo === 'ristorante' ? 'r' : 'a'
  const base = `/${prefix}/${slug}`
  const out = [{ icon: '🏠', label: 'Home', url: base }]
  for (const p of pages || []) {
    if (p.status !== 'pubblicata' || p.slug === '__home__') continue
    out.push({ icon: '📄', label: p.titolo || p.slug, url: `${base}/p/${p.slug}` })
  }
  out.push({ icon: '🔒', label: 'Privacy', url: `${base}/privacy` })
  out.push({ icon: '🍪', label: 'Cookie',  url: `${base}/cookie` })
  return out
}

// Bottone a tendina che, scelta una pagina interna, chiama onPick(url) con il path.
// Non renderizza nulla se non ci sono destinazioni (slug non ancora caricato).
export function LinkPicker({ links = [], onPick }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])
  if (!links.length) return null
  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button type="button" onClick={() => setOpen(o => !o)} title="Inserisci link a una pagina interna"
        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '9px 10px', border: '1px solid #c8d0f0', background: '#f0f4ff', borderRadius: 7, cursor: 'pointer', fontSize: 12, color: '#334', whiteSpace: 'nowrap', boxSizing: 'border-box' }}>
        <Link2 size={13} strokeWidth={1.5} /> Pagine <ChevronDown size={12} strokeWidth={1.5} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#fff', border: '1px solid #e0e0e8', borderRadius: 8, boxShadow: '0 8px 28px rgba(0,0,0,0.14)', zIndex: 1000, minWidth: 200, maxHeight: 300, overflowY: 'auto', padding: 4 }}>
          {links.map((l, i) => (
            <button key={i} type="button" onClick={() => { onPick(l.url); setOpen(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#333', borderRadius: 6 }}
              onMouseEnter={e => e.currentTarget.style.background = '#f4f6ff'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{l.icon}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
