'use client'
import { useEffect } from 'react'
import { FONT_PAIRS, HEADING_FAMILIES, BODY_FAMILIES, stileTitoli, FONTS_URL } from '@/lib/fonts'

// Le accoppiate di caratteri: ognuna si vede col NOME dell'attività come
// titolo, composto come lo sarà sul sito (peso, spazio fra le lettere,
// maiuscolo), e una riga di testo sotto. Un «Aa» non dice niente a chi sceglie.
// Imposta insieme theme.fontHeading e theme.fontBody.
export default function FontPairPicker({ theme, updateTheme, nome, stretto = false }) {
  const primary = theme.primaryColor || '#00b5b5'
  useEffect(() => {
    if (document.getElementById('fontpair-fonts')) return
    const link = document.createElement('link')
    link.id = 'fontpair-fonts'; link.rel = 'stylesheet'; link.href = FONTS_URL
    document.head.appendChild(link)
  }, [])
  const esempio = (typeof nome === 'string' && nome.trim()) ? nome.trim().slice(0, 28) : null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${stretto ? 150 : 190}px, 1fr))`, gap: 10 }}>
      {FONT_PAIRS.map(p => {
        const sel = theme.fontHeading === p.heading && theme.fontBody === p.body
        const t = stileTitoli(p.heading)
        return (
          <button key={p.key} type="button" data-accoppiata={p.key} aria-pressed={sel} onClick={() => updateTheme({ fontHeading: p.heading, fontBody: p.body })}
            style={{ padding: '14px 14px 12px', borderRadius: 12, cursor: 'pointer', textAlign: 'left', minWidth: 0, border: `2px solid ${sel ? primary : '#e8e8e8'}`, background: sel ? `${primary}10` : '#fff' }}>
            <div style={{ fontFamily: HEADING_FAMILIES[p.heading], fontSize: 21, fontWeight: t?.peso || 700, letterSpacing: t?.spazio, textTransform: t?.maiuscolo ? 'uppercase' : undefined, fontSynthesisWeight: 'none', color: '#1a1a2e', lineHeight: 1.1, overflowWrap: 'anywhere' }}>{esempio || p.label}</div>
            <div style={{ fontFamily: BODY_FAMILIES[p.body], fontSize: 12, color: '#555', marginTop: 7, lineHeight: 1.45 }}>Un testo di esempio, come si legge sul sito.</div>
            <div style={{ fontSize: 10.5, color: '#999', marginTop: 8 }}><strong style={{ color: '#666' }}>{p.label}</strong> · {p.vibe}</div>
          </button>
        )
      })}
    </div>
  )
}
