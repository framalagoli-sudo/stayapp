'use client'

// Dove si arriva rinunciando al pagamento.
//
// Non è un errore e non deve sembrarlo: chi ci arriva ha solo cambiato idea, o
// vuole controllare qualcosa prima di pagare. Il tono resta quello di una porta
// aperta, non di una bocciatura.
export default function Annullato() {
  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '64px 24px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f7fafc', color: '#718096', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, margin: '0 auto 22px' }}>↩</div>

      <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1a1a2e', margin: '0 0 12px' }}>Pagamento non completato</h1>

      <p style={{ fontSize: 16, color: '#555', lineHeight: 1.7, margin: '0 0 8px' }}>
        Non ti abbiamo addebitato nulla.
      </p>
      <p style={{ fontSize: 15, color: '#777', lineHeight: 1.7 }}>
        Il tuo ordine è rimasto in sospeso: puoi tornare al negozio e completarlo quando vuoi.
      </p>

      <button onClick={() => history.back()}
        style={{ marginTop: 26, padding: '12px 26px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15, fontWeight: 600 }}>
        ← Torna indietro
      </button>
    </div>
  )
}
