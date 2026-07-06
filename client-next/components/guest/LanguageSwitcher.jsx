'use client'
import { useEffect } from 'react'
import { pathForLang } from '@/lib/i18n'

// Autodetect INVISIBILE: imposta <html lang> e, alla prima visita con browser EN,
// reindirizza a /en (SEO-safe: i crawler senza JS vedono la pagina IT servita).
// Il toggle VISIBILE è ora nell'header del sito (components/guest/LangToggle.jsx).
export default function LanguageSwitcher({ lang = 'it' }) {
  useEffect(() => {
    document.documentElement.lang = lang
    if (!document.cookie.includes('lang=')) {
      const nav = (navigator.language || '').toLowerCase()
      const onEn = window.location.pathname === '/en' || window.location.pathname.startsWith('/en/')
      if (nav.startsWith('en') && !onEn) {
        window.location.replace(pathForLang(window.location.pathname, 'en') + window.location.search + window.location.hash)
      }
    }
  }, [lang])

  return null
}
