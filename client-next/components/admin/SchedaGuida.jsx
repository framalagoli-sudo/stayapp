'use client'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

// Una scheda della guida (lib/guida/*), disegnata uguale nel riquadro «Come
// funziona» e nella pagina «Aiuto». I testi sono stringhe semplici: le «»
// indicano i nomi dei pulsanti, così chi legge li ritrova sullo schermo.

export default function SchedaGuida({ scheda, compatta = false }) {
  const [aperta, setAperta] = useState(null)
  if (!scheda) return null
  return (
    <div data-scheda-guida={scheda.voce} style={{ fontSize: 14, color: '#333', lineHeight: 1.65 }}>
      <p style={{ margin: '0 0 16px', fontSize: compatta ? 14 : 15, color: '#444' }}>{scheda.aCosaServe}</p>

      {scheda.passi.map((p, i) => (
        <section key={i} style={{ marginBottom: 18 }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>{p.titolo}</h3>
          <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 5 }}>
            {p.testo.map((t, j) => <li key={j} style={{ overflowWrap: 'anywhere' }}>{t}</li>)}
          </ol>
        </section>
      ))}

      {scheda.domande?.length > 0 && (
        <section>
          <h3 style={{ margin: '4px 0 6px', fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>Domande frequenti</h3>
          <div style={{ border: '1px solid #eee', borderRadius: 10, overflow: 'hidden' }}>
            {scheda.domande.map((q, i) => (
              <div key={i} style={{ borderTop: i ? '1px solid #f0f0f0' : 'none' }}>
                <button onClick={() => setAperta(aperta === i ? null : i)} aria-expanded={aperta === i}
                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '11px 14px', background: '#fff', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 14, fontWeight: 600, color: '#1a1a2e', fontFamily: 'inherit' }}>
                  <span style={{ overflowWrap: 'anywhere' }}>{q.d}</span>
                  <ChevronDown size={16} strokeWidth={1.5} color="#999" style={{ flexShrink: 0, transform: aperta === i ? 'rotate(180deg)' : 'none' }} />
                </button>
                {aperta === i && <div style={{ padding: '0 14px 12px', color: '#555', overflowWrap: 'anywhere' }}>{q.r}</div>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
