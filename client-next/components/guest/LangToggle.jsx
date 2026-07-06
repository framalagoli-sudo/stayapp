'use client'
import { pathForLang } from '@/lib/i18n'

// Toggle lingua IT↔EN inline, da usare DENTRO l'header del sito (non più un pill
// flottante). Cambia lingua: salva il cookie e naviga alla versione /en o /it.
export default function LangToggle({ lang = 'it', color = '#1a1a2e' }) {
  const other = lang === 'en' ? 'it' : 'en'
  function switchTo() {
    document.cookie = `lang=${other}; path=/; max-age=31536000; samesite=lax`
    window.location.assign(pathForLang(window.location.pathname, other) + window.location.search + window.location.hash)
  }
  return (
    <button onClick={switchTo} aria-label={other === 'en' ? 'Switch to English' : 'Passa all’italiano'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: 'none', border: 'none', cursor: 'pointer',
        color, fontSize: 13, fontWeight: 600, padding: '6px 6px', whiteSpace: 'nowrap',
      }}>
      {other === 'en' ? '🇬🇧 EN' : '🇮🇹 IT'}
    </button>
  )
}
