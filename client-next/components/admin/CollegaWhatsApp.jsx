'use client'
import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { Link2, AlertCircle } from 'lucide-react'

// Il collegamento guidato di Meta («Embedded Signup»), versione 4.
//
// Fino al 16/09/2026 questo pulsante faceva `alert('si aprirà qui')`: il lato
// server c'era tutto, la finestra di Meta no. Qui si apre davvero.
//
// Come funziona: si carica l'SDK di Facebook, il cliente fa il giro nella
// finestra di Meta (sceglie il portafoglio, verifica il numero, mette la carta)
// e al ritorno arrivano DUE cose da due strade diverse:
//   · un **codice** dalla callback di `FB.login`, che solo il nostro server può
//     scambiare con un token (il segreto dell'app non esce dal server);
//   · **quale account e quale numero** ha scelto, da un messaggio che la
//     finestra manda alla pagina.
// Servono entrambe, e possono arrivare in ordine qualsiasi: si aspetta di
// averle tutte e due prima di chiamare il nostro server.
//
// ⚠️ La v2 del flusso viene dismessa il 15/10/2026: questo è scritto sulla v4.

const SDK = 'https://connect.facebook.net/it_IT/sdk.js'
const GRAPH_VERSION = 'v21.0'   // la stessa che usa lib/whatsapp.js sul server

// Solo Meta può dirci quale numero ha collegato il cliente. `endsWith` non
// basterebbe: `facebook.com.esempio.it` lo passerebbe.
const ORIGINI_META = [
  'https://www.facebook.com', 'https://facebook.com',
  'https://web.facebook.com', 'https://business.facebook.com',
]

function caricaSdk(appId) {
  if (typeof window === 'undefined') return Promise.reject(new Error('non nel browser'))
  if (window.FB) return Promise.resolve(window.FB)
  return new Promise((risolvi, rifiuta) => {
    window.fbAsyncInit = () => {
      window.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version: GRAPH_VERSION })
      risolvi(window.FB)
    }
    const s = document.createElement('script')
    s.src = SDK
    s.async = true
    s.defer = true
    s.crossOrigin = 'anonymous'
    s.onerror = () => rifiuta(new Error('Non riesco a caricare il collegamento di Meta. Un blocco pubblicità potrebbe impedirlo.'))
    document.body.appendChild(s)
  })
}

export default function CollegaWhatsApp({ aziendaId, meta, entita = [], numeriCollegati = [], onFatto }) {
  const [attesa, setAttesa] = useState(false)
  const [errore, setErrore] = useState('')
  const [avvisi, setAvvisi] = useState([])
  // Le entità che un numero ce l'hanno già non si ripropongono: si scollega
  // quello vecchio, altrimenti si collegherebbe due volte la stessa attività.
  const libere = entita.filter(e => !numeriCollegati.some(n => n.entity_id === e.id))
  const [perChi, setPerChi] = useState('')
  const scelta = useRef({ waba_id: null, phone_number_id: null })

  // Il messaggio della finestra di Meta arriva anche PRIMA che il cliente
  // finisca: si tiene l'ultimo e lo si usa quando arriva il codice.
  useEffect(() => {
    function ascolta(ev) {
      if (!ORIGINI_META.includes(ev.origin)) return
      try {
        const dati = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data
        if (dati?.type !== 'WA_EMBEDDED_SIGNUP') return
        if (dati.data?.waba_id) scelta.current.waba_id = dati.data.waba_id
        if (dati.data?.phone_number_id) scelta.current.phone_number_id = dati.data.phone_number_id
      } catch { /* non è roba nostra */ }
    }
    window.addEventListener('message', ascolta)
    return () => window.removeEventListener('message', ascolta)
  }, [])

  async function collega() {
    setErrore(''); setAttesa(true)
    scelta.current = { waba_id: null, phone_number_id: null }
    try {
      const FB = await caricaSdk(meta.app_id)
      const risposta = await new Promise(risolvi => {
        FB.login(risolvi, {
          config_id: meta.config_id,
          response_type: 'code',
          override_default_response_type: true,
          extras: { setup: {} },
        })
      })
      const code = risposta?.authResponse?.code
      if (!code) {
        // Chi chiude la finestra a metà non ha sbagliato niente: non è un errore.
        setErrore(risposta?.status === 'unknown' || !risposta ? 'Collegamento annullato.' : 'Collegamento non completato: riprova.')
        setAttesa(false)
        return
      }
      if (!scelta.current.waba_id) {
        setErrore('Meta non ci ha detto quale account hai collegato. Riprova e completa tutti i passaggi fino alla fine.')
        setAttesa(false)
        return
      }
      const esito = await apiFetch('/api/whatsapp/connect', {
        method: 'POST',
        body: JSON.stringify({
          azienda_id: aziendaId,
          entity_id: perChi || null,
          code,
          waba_id: scelta.current.waba_id,
          phone_number_id: scelta.current.phone_number_id,
        }),
      })
      // Un collegamento riuscito a metà lo si dice qui, non lo si lascia
      // scoprire al primo invio che fallisce.
      setAvvisi(esito?.avvisi || [])
      onFatto?.(esito)
    } catch (e) {
      setErrore(e?.message || 'Collegamento non riuscito')
    }
    setAttesa(false)
  }

  return (
    <div>
      {libere.length > 0 && entita.length > 1 && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>
            Questo numero di chi è?
          </label>
          <select
            value={perChi}
            onChange={e => setPerChi(e.target.value)}
            style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, maxWidth: 360, width: '100%' }}
          >
            <option value="">Di tutta l’azienda</option>
            {libere.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <div style={{ fontSize: 11.5, color: '#999', marginTop: 4 }}>
            Chi non ha un numero suo scrive con quello dell’azienda.
          </div>
        </div>
      )}

      <button
        onClick={collega}
        disabled={attesa}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: attesa ? '#9ad3ae' : '#25D366', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 700, cursor: attesa ? 'default' : 'pointer' }}
      >
        <Link2 size={16} strokeWidth={2} /> {attesa ? 'Collegamento in corso…' : 'Collega WhatsApp'}
      </button>

      {avvisi.map((a, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, background: '#fffaf5', border: '1px solid #ffe0b2', borderRadius: 8, padding: '10px 12px', marginTop: 12 }}>
          <AlertCircle size={16} strokeWidth={1.5} color="#e65100" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: 13, color: '#7a4a00', lineHeight: 1.5 }}>{a}</p>
        </div>
      ))}

      {errore && (
        <div style={{ display: 'flex', gap: 8, background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: 8, padding: '10px 12px', marginTop: 12 }}>
          <AlertCircle size={16} strokeWidth={1.5} color="#c53030" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: 13, color: '#c53030', lineHeight: 1.5 }}>{errore}</p>
        </div>
      )}
    </div>
  )
}
