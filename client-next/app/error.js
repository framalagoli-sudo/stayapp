'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Error boundary globale (App Router): cattura i crash lato client, mostra un
// fallback pulito (prima c'era la schermata grezza di Next) e manda l'errore al
// server (→ Runtime Logs di Vercel) in modo best-effort, senza bloccare nulla.
export default function Error({ error, reset }) {
  const pathname = usePathname()

  useEffect(() => {
    try {
      fetch('/api/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error?.message,
          name: error?.name,
          stack: error?.stack,
          digest: error?.digest,
          path: pathname,
        }),
        keepalive: true,
      }).catch(() => {})
    } catch {}
  }, [error, pathname])

  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ margin: 0, color: '#1a1a2e' }}>Ops, qualcosa è andato storto</h2>
      <p style={{ margin: 0, color: '#666', maxWidth: 440 }}>Si è verificato un errore imprevisto. Riprova; se il problema persiste, ricarica la pagina.</p>
      <button onClick={() => reset()} style={{ padding: '10px 20px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Riprova</button>
    </div>
  )
}
