'use client'
import { useEffect } from 'react'
import { pathForLang } from '@/lib/i18n'

// Overlay flottante: bandierina per cambiare lingua + imposta <html lang> +
// autodetect (client-side → SEO-safe: i crawler senza JS vedono la pagina IT servita).
export default function LanguageSwitcher({ lang = 'it' }) {
  const other = lang === 'en' ? 'it' : 'en'

  useEffect(() => {
    document.documentElement.lang = lang
    // Autodetect una sola volta: se non c'è scelta salvata e il browser è EN,
    // e non siamo già su /en, vai alla versione EN.
    if (!document.cookie.includes('lang=')) {
      const nav = (navigator.language || '').toLowerCase()
      const onEn = window.location.pathname === '/en' || window.location.pathname.startsWith('/en/')
      if (nav.startsWith('en') && !onEn) {
        window.location.replace(pathForLang(window.location.pathname, 'en') + window.location.search + window.location.hash)
      }
    }
  }, [lang])

  function switchTo() {
    document.cookie = `lang=${other}; path=/; max-age=31536000; samesite=lax`
    const target = pathForLang(window.location.pathname, other) + window.location.search + window.location.hash
    window.location.assign(target)
  }

  return (
    <button onClick={switchTo} aria-label={other === 'en' ? 'Switch to English' : 'Passa all’italiano'}
      style={{
        position: 'fixed', top: 12, right: 12, zIndex: 2000,
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 10px', borderRadius: 20, border: '1px solid rgba(0,0,0,0.12)',
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
        cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#1a1a2e', boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
      }}>
      {other === 'en' ? '🇬🇧 EN' : '🇮🇹 IT'}
    </button>
  )
}
