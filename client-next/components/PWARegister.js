'use client'
import { useEffect } from 'react'

// Non registriamo più il SW di next-pwa (serviva shell stale -> pagine bianche).
// Disiscriviamo eventuali SW residui e svuotiamo le cache: ogni visita carica fresco.
// Il kill-switch in /public/sw.js ripulisce anche i browser già incastrati.
export default function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {})
    }
    if (typeof caches !== 'undefined') {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {})
    }
  }, [])
  return null
}
