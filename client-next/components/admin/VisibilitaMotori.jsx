'use client'
import { useState } from 'react'
import { apiFetch } from '@/lib/api'
import { Search, EyeOff, ExternalLink } from 'lucide-react'

// «Questo sito si trova su Google?»
//
// Sta in cima alla pagina del sito, non dentro una scheda: è una domanda che il
// cliente deve vedere senza cercarla, e la risposta cambia il suo lavoro.
//
// Un sito nuovo nasce **nascosto** (migration 116). Il motivo è semplice: il
// giorno in cui si registra, il sito contiene il testo di esempio — ed è quello
// che Google fotograferebbe. Un sito vuoto indicizzato è peggio di un sito non
// indicizzato, perché la prima impressione se la prende il motore di ricerca e
// la tiene per settimane.
//
// ⚠️ «Rendilo trovabile» non fa comparire il sito su Google in un minuto:
// nessuno può prometterlo, e prometterlo sarebbe la bugia più facile da dire
// qui dentro. Toglie il divieto e lo mette nella sitemap — poi i tempi li
// decide Google. Il testo lo dice, invece di far sperare.

const ENDPOINT = { struttura: 'properties', ristorante: 'ristoranti', attivita: 'attivita' }

export default function VisibilitaMotori({ entityData, entityTipo, entityId, onCambiata }) {
  const [salvando, setSalvando] = useState(false)
  const [errore, setErrore] = useState(null)
  if (!entityData) return null

  // Assente = vecchia entità creata prima della migration: erano tutte visibili.
  const visibile = entityData.indicizzabile !== false
  const minisitoAcceso = !!entityData.minisito?.active

  async function cambia(nuovo) {
    setSalvando(true); setErrore(null)
    try {
      await apiFetch(`/api/${ENDPOINT[entityTipo]}/${entityId}`, {
        method: 'PATCH', body: JSON.stringify({ indicizzabile: nuovo }),
      })
      onCambiata?.(nuovo)
    } catch (e) { setErrore(e.message) }
    finally { setSalvando(false) }
  }

  const bordo = visibile ? '#cfe8d4' : '#f2dfae'
  const fondo = visibile ? '#f4faf5' : '#fffaf0'

  return (
    <div style={{ border: `1px solid ${bordo}`, background: fondo, borderRadius: 12, padding: '14px 18px', marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        {visibile
          ? <Search size={18} strokeWidth={1.5} color="#2e7d32" style={{ marginTop: 2, flexShrink: 0 }} />
          : <EyeOff size={18} strokeWidth={1.5} color="#a97a20" style={{ marginTop: 2, flexShrink: 0 }} />}

        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>
            {visibile ? 'Questo sito si può trovare su Google' : 'Questo sito non è ancora su Google'}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13.5, color: '#555', lineHeight: 1.6 }}>
            {visibile
              ? 'I motori di ricerca possono mostrarlo nei risultati, insieme alle sue pagine ed eventi.'
              : 'Nessun motore di ricerca lo mostra: è quello che serve finché lo stai preparando. Quando è pronto, accendilo.'}
            {!minisitoAcceso && (
              <> <strong>Attenzione</strong>: il sito pubblico è spento, quindi resta invisibile comunque —
              si accende dalle impostazioni del minisito.</>
            )}
          </p>
          {errore && <p style={{ margin: '6px 0 0', fontSize: 13, color: '#c0392b' }}>{errore}</p>}
        </div>

        <button onClick={() => cambia(!visibile)} disabled={salvando}
          style={{
            padding: '9px 16px', borderRadius: 9, border: visibile ? '1px solid #ccc' : 'none',
            background: visibile ? '#fff' : '#1a1a2e', color: visibile ? '#555' : '#fff',
            fontSize: 14, fontWeight: 700, cursor: salvando ? 'wait' : 'pointer', flexShrink: 0,
          }}>
          {salvando ? 'Un attimo…' : visibile ? 'Nascondi ai motori' : 'Rendilo trovabile'}
        </button>
      </div>

      {/* Acceso l'interruttore, il lavoro non è finito: senza dire cosa fare
          adesso, il cliente aspetta un risultato che non arriva da solo. */}
      {visibile && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #d9e7dc', fontSize: 12.5, color: '#666', lineHeight: 1.6 }}>
          Comparire nei risultati richiede giorni o settimane: decide Google, non noi. Per accorciare i
          tempi, registra il sito su{' '}
          <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer"
            style={{ color: '#2e7d32', fontWeight: 600, textDecoration: 'none' }}>
            Search Console <ExternalLink size={11} strokeWidth={2} style={{ verticalAlign: 'middle' }} />
          </a>{' '}e indica la mappa del sito, che troviamo e aggiorniamo noi.
        </div>
      )}
    </div>
  )
}
