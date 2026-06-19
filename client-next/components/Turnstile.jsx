'use client'
import { useEffect, useRef, useState } from 'react'

// Legge la Site Key a RUNTIME dal meta tag iniettato dal layout server
// (`<meta name="cf-turnstile-sitekey">`). Così la chiave NON dipende dall'inlining
// build-time delle var NEXT_PUBLIC_* (che la build cache poteva perdere → widget
// non renderizzato → form bloccati in strict). Fallback alla versione build-inlined.
function readSiteKey() {
  if (typeof document !== 'undefined') {
    const m = document.querySelector('meta[name="cf-turnstile-sitekey"]')?.content?.trim()
    if (m) return m
  }
  return (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '').trim()
}

// Widget Cloudflare Turnstile. Si renderizza solo se la Site Key è disponibile.
export default function Turnstile({ onToken }) {
  const ref = useRef(null)
  const widgetId = useRef(null)
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken
  const [active, setActive] = useState(false)

  useEffect(() => {
    const SITE_KEY = readSiteKey()
    if (!SITE_KEY) return
    setActive(true)
    let cancelled = false

    function render() {
      if (cancelled || !ref.current || !window.turnstile || widgetId.current !== null) return
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: SITE_KEY,
        callback: (token) => onTokenRef.current?.(token),
        'error-callback': () => onTokenRef.current?.(''),
        'expired-callback': () => onTokenRef.current?.(''),
      })
    }

    if (window.turnstile) {
      render()
    } else if (!document.getElementById('cf-turnstile-script')) {
      const s = document.createElement('script')
      s.id = 'cf-turnstile-script'
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      s.async = true
      s.defer = true
      s.onload = render
      document.head.appendChild(s)
    } else {
      const iv = setInterval(() => {
        if (window.turnstile) { clearInterval(iv); render() }
      }, 200)
      return () => { cancelled = true; clearInterval(iv) }
    }

    return () => { cancelled = true }
  }, [])

  // Il container c'è sempre (serve il ref all'effect); il margine appare solo col widget.
  return <div ref={ref} style={active ? { margin: '8px 0' } : undefined} />
}
