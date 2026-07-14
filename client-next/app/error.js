'use client'
import { useEffect } from 'react'
import { useLogger, LogLevel } from 'next-axiom'
import { usePathname } from 'next/navigation'

// Error boundary globale (App Router): cattura i crash lato client, li manda ad
// Axiom (monitoring) e mostra un fallback pulito invece della schermata di errore
// grezza di Next. Prima non c'era nessun boundary.
export default function Error({ error, reset }) {
  const log = useLogger({ source: 'error.js' })
  const pathname = usePathname()

  useEffect(() => {
    try {
      log.logHttpRequest(
        LogLevel.error,
        error?.message || 'Errore client non gestito',
        { host: typeof window !== 'undefined' ? window.location.href : '', path: pathname, statusCode: 500 },
        { error: error?.name, stack: error?.stack, digest: error?.digest },
      )
    } catch {}
  }, [error])

  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ margin: 0, color: '#1a1a2e' }}>Ops, qualcosa è andato storto</h2>
      <p style={{ margin: 0, color: '#666', maxWidth: 440 }}>Si è verificato un errore imprevisto. Riprova; se il problema persiste, ricarica la pagina.</p>
      <button onClick={() => reset()} style={{ padding: '10px 20px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Riprova</button>
    </div>
  )
}
