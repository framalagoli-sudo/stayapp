'use client'
import { useEffect } from 'react'
import { FONT_PAIRS, HEADING_FAMILIES, BODY_FAMILIES } from '@/lib/fonts'

const FONTS_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Lato:wght@400;600&family=Open+Sans:wght@400;600&family=Playfair+Display:wght@400;600&family=Cormorant+Garamond:wght@400;600&family=Raleway:wght@400;600&family=Montserrat:wght@400;600&family=Nunito:wght@400;600&family=DM+Sans:wght@400;600&display=swap'

// Selettore di abbinamenti font curati, condiviso dalle 3 pagine Tema + Sito.
// Imposta insieme theme.fontHeading + theme.fontBody. I selettori singoli
// (Font titoli / Font testo) restano sotto come modalità avanzata.
export default function FontPairPicker({ theme, updateTheme }) {
  const primary = theme.primaryColor || '#00b5b5'
  useEffect(() => {
    if (document.getElementById('fontpair-fonts')) return
    const link = document.createElement('link')
    link.id = 'fontpair-fonts'; link.rel = 'stylesheet'; link.href = FONTS_URL
    document.head.appendChild(link)
  }, [])
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
      {FONT_PAIRS.map(p => {
        const sel = theme.fontHeading === p.heading && theme.fontBody === p.body
        return (
          <button key={p.key} type="button" onClick={() => updateTheme({ fontHeading: p.heading, fontBody: p.body })}
            style={{ padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', border: `2px solid ${sel ? primary : '#e8e8e8'}`, background: sel ? `${primary}12` : '#fafafa' }}>
            <div style={{ fontFamily: HEADING_FAMILIES[p.heading], fontSize: 18, fontWeight: 700, color: '#222', lineHeight: 1.1 }}>{p.label}</div>
            <div style={{ fontFamily: BODY_FAMILIES[p.body], fontSize: 12, color: '#666', marginTop: 5 }}>Esempio di testo del sito</div>
            <div style={{ fontSize: 10, color: '#aaa', marginTop: 5 }}>{p.vibe}</div>
          </button>
        )
      })}
    </div>
  )
}
