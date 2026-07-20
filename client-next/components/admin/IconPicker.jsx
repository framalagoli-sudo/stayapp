'use client'
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { BLOCK_ICONS, blockIconEntry } from '@/lib/blockIcons'

// Selettore visuale di icone: mostra l'icona scelta e apre una griglia cercabile
// di icone da cliccare. Sostituisce il campo testo dove si scriveva il nome.
export function IconPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const cur = blockIconEntry(value)
  const Cur = cur?.Icon
  const list = q
    ? BLOCK_ICONS.filter(i => i.key.includes(q.toLowerCase()) || i.label.toLowerCase().includes(q.toLowerCase()))
    : BLOCK_ICONS

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#333', textAlign: 'left' }}>
        {Cur ? <Cur size={18} strokeWidth={1.5} color="#1a1a2e" /> : <span style={{ width: 18, height: 18, borderRadius: 4, border: '1px dashed #ccc', flexShrink: 0 }} />}
        <span style={{ flex: 1, color: cur ? '#1a1a2e' : '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cur ? cur.label : 'Scegli un’icona'}</span>
        {value && <X size={14} strokeWidth={2} color="#bbb" onClick={e => { e.stopPropagation(); onChange('') }} />}
        <ChevronDown size={14} strokeWidth={1.5} color="#aaa" />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '1px solid #e0e0e8', borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,0.16)', zIndex: 1000, padding: 8 }}>
          <input autoFocus placeholder="Cerca…" value={q} onChange={e => setQ(e.target.value)}
            style={{ width: '100%', padding: '7px 10px', border: '1px solid #e0e0e8', borderRadius: 7, fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
            {list.map(({ key, label, Icon }) => {
              const sel = value === key
              return (
                <button key={key} type="button" title={label} onClick={() => { onChange(key); setOpen(false); setQ('') }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', aspectRatio: '1', border: sel ? '2px solid #1a1a2e' : '1px solid #eee', borderRadius: 8, background: sel ? '#f0f2ff' : '#fff', cursor: 'pointer' }}
                  onMouseEnter={e => { if (!sel) e.currentTarget.style.background = '#f5f6fb' }}
                  onMouseLeave={e => { if (!sel) e.currentTarget.style.background = '#fff' }}>
                  <Icon size={20} strokeWidth={1.5} color="#1a1a2e" />
                </button>
              )
            })}
            {!list.length && <div style={{ gridColumn: '1/-1', fontSize: 12, color: '#aaa', padding: 8, textAlign: 'center' }}>Nessuna icona</div>}
          </div>
        </div>
      )}
    </div>
  )
}
