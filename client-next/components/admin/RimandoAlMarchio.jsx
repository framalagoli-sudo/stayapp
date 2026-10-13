'use client'
import { Palette } from 'lucide-react'

// Logo, copertina, colori e caratteri stavano in questa pagina: ora sono tutti
// in «Marchio e stile». Chi li cerca qui trova la porta, non un vuoto.
export default function RimandoAlMarchio({ href }) {
  return (
    <a href={href} data-rimando-marchio
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', marginBottom: 20, borderRadius: 12, background: '#f8f9ff', border: '1px solid #e0e5ff', textDecoration: 'none', color: '#1a1a2e' }}>
      <Palette size={20} strokeWidth={1.5} color="#5b6af8" style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 13.5, lineHeight: 1.5 }}>
        <strong>Logo, foto di copertina, colori e caratteri</strong> si impostano in <span style={{ color: '#5b6af8', fontWeight: 700, whiteSpace: 'nowrap' }}>Marchio e stile →</span>
      </span>
    </a>
  )
}
