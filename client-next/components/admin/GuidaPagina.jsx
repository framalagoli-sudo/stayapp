'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { LifeBuoy, X } from 'lucide-react'
import { schedaDelPercorso } from '@/lib/guida'
import SchedaGuida from './SchedaGuida'

// «Come funziona»: in cima a ogni pagina del pannello che ha la sua scheda di
// guida. Si apre di lato, senza lasciare la pagina: chi cerca aiuto lo cerca
// mentre sta facendo la cosa, non in un'altra pagina.
// Le pagine senza scheda non mostrano niente (la guida cresce a gruppi).

export default function GuidaPagina() {
  const pathname = usePathname()
  const scheda = schedaDelPercorso(pathname)
  const [aperta, setAperta] = useState(false)

  useEffect(() => { setAperta(false) }, [pathname])
  useEffect(() => {
    if (!aperta) return
    const esc = e => { if (e.key === 'Escape') setAperta(false) }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [aperta])

  if (!scheda) return null
  return (
    <>
      <button data-guida-apri onClick={() => setAperta(true)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, border: '1px solid #ddd', background: '#fff', fontSize: 13, fontWeight: 600, color: '#1a1a2e', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, marginBottom: 12 }}>
        <LifeBuoy size={15} strokeWidth={1.5} color="#1a1a2e" /> Come funziona
      </button>
      {aperta && (
        <div onClick={() => setAperta(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 9000, display: 'flex', justifyContent: 'flex-end' }}>
          <aside role="dialog" aria-modal="true" aria-labelledby="titolo-guida" data-guida-pannello onClick={e => e.stopPropagation()}
            style={{ background: '#fff', width: '100%', maxWidth: 460, height: '100%', overflowY: 'auto', boxShadow: '-8px 0 30px rgba(0,0,0,0.15)', padding: '20px 22px 32px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.4 }}>Come funziona</div>
                <div id="titolo-guida" style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e' }}>{scheda.titolo}</div>
              </div>
              <button onClick={() => setAperta(false)} aria-label="Chiudi" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={20} strokeWidth={1.5} color="#666" /></button>
            </div>
            <SchedaGuida scheda={scheda} compatta />
            <p style={{ marginTop: 22, fontSize: 13, color: '#888' }}>
              Non trovi la risposta? In <a href="/admin/help" style={{ color: '#1a1a2e', fontWeight: 600 }}>Aiuto</a> puoi scriverci.
            </p>
          </aside>
        </div>
      )}
    </>
  )
}
