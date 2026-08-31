'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

// Dove si arriva dopo aver pagato.
//
// ⚠️ Questa pagina non esisteva. Il checkout ci mandava chi aveva appena pagato
// e trovava un **404**: soldi usciti dal conto e una schermata d'errore. È lo
// stesso difetto della pagina delle offerte — un indirizzo scritto senza mai
// aprirlo — e stavolta cadeva nel punto peggiore possibile.
//
// ⚠️ `useSearchParams` va dentro `<Suspense>`, altrimenti Next si rifiuta di
// costruire la pagina.

function Esito() {
  const params = useSearchParams()
  const sid = params.get('session_id')
  const [ordine, setOrdine] = useState(null)

  useEffect(() => {
    if (!sid) { setOrdine({ trovato: false }); return }
    fetch(`/api/shop/public/esito?session_id=${encodeURIComponent(sid)}`)
      .then(r => r.json()).then(setOrdine).catch(() => setOrdine({ trovato: false }))
  }, [sid])

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '64px 24px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fff4', color: '#276749', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, margin: '0 auto 22px' }}>✓</div>

      <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1a1a2e', margin: '0 0 12px' }}>Grazie, è tutto a posto</h1>

      {ordine?.trovato ? (
        <>
          <p style={{ fontSize: 16, color: '#555', lineHeight: 1.7, margin: '0 0 8px' }}>
            Il tuo ordine <strong>#{ordine.numero}</strong> è stato registrato.
          </p>
          {/* Il pagamento può risultare ancora in corso: la conferma di Stripe
              arriva in un istante diverso dal ritorno del browser. Meglio dirlo
              che far credere a un problema. */}
          <p style={{ fontSize: 15, color: '#777', lineHeight: 1.7 }}>
            {ordine.pagato
              ? 'Il pagamento è stato ricevuto.'
              : 'Stiamo registrando il pagamento: se hai completato l’operazione, è tutto a posto.'}
          </p>
        </>
      ) : ordine === null ? (
        <p style={{ color: '#888' }}>Un momento…</p>
      ) : (
        <p style={{ fontSize: 16, color: '#555', lineHeight: 1.7 }}>
          Il tuo ordine è stato registrato. Riceverai una conferma via email.
        </p>
      )}

      <p style={{ fontSize: 14, color: '#999', marginTop: 26, lineHeight: 1.7 }}>
        Riceverai una email di conferma. Per qualsiasi cosa, rispondi a quella email:
        arriva direttamente a chi ti ha venduto.
      </p>
    </div>
  )
}

export default function Successo() {
  return <Suspense fallback={<div style={{ padding: 64, textAlign: 'center', color: '#888' }}>Un momento…</div>}><Esito /></Suspense>
}
