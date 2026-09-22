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
// ⛔ Poi è esistita, ma era **cieca** (22/09/2026, primo incasso vero di
// Garage 22): chiedeva a `/api/shop/public/esito`, che cerca solo negli ordini
// del negozio. Chi aveva pagato un posto a una cena leggeva «Il tuo ordine è
// stato registrato», senza il nome dell'evento, senza il nome del locale e
// **senza un link per tornare indietro**. Una pagina bianca di uno sconosciuto,
// subito dopo aver dato i soldi: il momento in cui la fiducia serve di più.
//
// Ora chiede a `/api/guest/pagamento/esito`, che cerca nei tre posti in cui si
// incassa, e la pagina si veste del cliente: il suo logo, il suo colore, e in
// fondo la porta per tornare sul **suo** sito.
//
// ⚠️ `useSearchParams` va dentro `<Suspense>`, altrimenti Next si rifiuta di
// costruire la pagina.

const FONDO = '#f7f7fa'

function dataLeggibile(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('it-IT', {
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    })
  } catch { return null }
}

function Esito() {
  const params = useSearchParams()
  const sid = params.get('session_id')
  const [esito, setEsito] = useState(null)

  useEffect(() => {
    if (!sid) { setEsito({ trovato: false }); return }
    fetch(`/api/guest/pagamento/esito?session_id=${encodeURIComponent(sid)}`)
      .then(r => r.json()).then(setEsito).catch(() => setEsito({ trovato: false }))
  }, [sid])

  const sito = esito?.sito || null
  // Il colore del cliente, se ce l'ha. Il verde resta il segnale «è andata
  // bene» e non si tinge: è l'unica cosa che deve dire la stessa cosa ovunque.
  const colore = sito?.colore || '#1a1a2e'
  const quando = dataLeggibile(esito?.quando)

  return (
    <div style={{ minHeight: '100vh', background: FONDO, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '56px 20px 72px' }}>

        {/* Di chi è questa pagina. Va PRIMA della spunta: la domanda di chi
            atterra qui non è «è andata bene?» ma «dove sono finito?». */}
        {sito?.nome && (
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            {sito.logo
              ? <img src={sito.logo} alt={sito.nome} style={{ maxHeight: 54, maxWidth: '70%', objectFit: 'contain' }} />
              : <div style={{ fontSize: 18, fontWeight: 700, color: colore }}>{sito.nome}</div>}
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: 16, padding: '38px 28px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <div style={{ width: 62, height: 62, borderRadius: '50%', background: '#f0fff4', color: '#276749', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 20px' }}>✓</div>

          <h1 style={{ fontSize: 25, fontWeight: 800, color: '#1a1a2e', margin: '0 0 10px', lineHeight: 1.3 }}>
            Grazie, è tutto a posto
          </h1>

          {esito === null ? (
            <p style={{ color: '#888', margin: 0 }}>Un momento…</p>
          ) : esito.trovato ? (
            <>
              {/* Cosa hai pagato, con le parole della cosa che hai pagato: un
                  posto a una cena non è «un ordine». */}
              <p style={{ fontSize: 17, color: '#1a1a2e', fontWeight: 600, lineHeight: 1.5, margin: '0 0 6px' }}>
                {esito.titolo}
              </p>
              {quando && (
                <p style={{ fontSize: 14.5, color: '#666', margin: '0 0 4px' }}>{quando}</p>
              )}
              {esito.tipo === 'evento' && esito.posti > 1 && (
                <p style={{ fontSize: 14.5, color: '#666', margin: '0 0 4px' }}>{esito.posti} posti</p>
              )}
              {esito.importo > 0 && (
                <p style={{ fontSize: 14.5, color: '#666', margin: '0 0 14px' }}>€{esito.importo}</p>
              )}

              {/* ⚠️ Il pagamento può risultare ancora in corso: la conferma di
                  Stripe arriva in un istante diverso dal ritorno del browser, e
                  con alcuni metodi ci mette giorni. Dirlo è meglio che far
                  credere a un problema che non c'è. */}
              <p style={{ fontSize: 14.5, color: '#777', lineHeight: 1.7, margin: 0 }}>
                {esito.pagato
                  ? 'Il pagamento è stato ricevuto.'
                  : 'Stiamo registrando il pagamento: se hai completato l’operazione, è tutto a posto.'}
              </p>
            </>
          ) : (
            <p style={{ fontSize: 16, color: '#555', lineHeight: 1.7, margin: 0 }}>
              Il pagamento è stato registrato. Riceverai una conferma via email.
            </p>
          )}

          <p style={{ fontSize: 13.5, color: '#999', marginTop: 24, marginBottom: 0, lineHeight: 1.7 }}>
            Riceverai una email di conferma. Per qualsiasi cosa, rispondi a quella email:
            arriva direttamente a chi ti ha venduto.
          </p>
        </div>

        {/* ⛔ La porta di uscita. Era questa a mancare: chi pagava restava in un
            vicolo cieco, sul dominio di uno sconosciuto, senza un modo per
            tornare dove stava. Punta all'indirizzo UFFICIALE del cliente (il
            suo dominio se ce l'ha), non al nostro percorso interno. */}
        {sito?.url && (
          <div style={{ textAlign: 'center', marginTop: 26 }}>
            <a href={sito.url} style={{
              display: 'inline-block', padding: '13px 26px', borderRadius: 10,
              background: colore, color: '#fff', fontWeight: 700, fontSize: 15,
              textDecoration: 'none',
            }}>
              {sito.nome ? `Torna su ${sito.nome}` : 'Torna al sito'}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Successo() {
  return <Suspense fallback={<div style={{ padding: 64, textAlign: 'center', color: '#888' }}>Un momento…</div>}><Esito /></Suspense>
}
