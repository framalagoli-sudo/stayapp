'use client'
import { useEffect, useRef } from 'react'

const SITE_KEY = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '').trim()

// Widget Cloudflare Turnstile. Si renderizza SOLO se NEXT_PUBLIC_TURNSTILE_SITE_KEY
// è impostata → finché non crei la chiave nel dashboard CF, è invisibile e i form
// funzionano come prima. Chiama onToken(token) quando l'utente passa la verifica.
export default function Turnstile({ onToken }) {
  const ref = useRef(null)
  const widgetId = useRef(null)
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken

  useEffect(() => {
    if (!SITE_KEY) return
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

  if (!SITE_KEY) return null
  return <div ref={ref} style={{ margin: '8px 0' }} />
}
