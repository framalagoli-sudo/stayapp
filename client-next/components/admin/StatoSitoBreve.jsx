'use client'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { CheckCircle2, AlertCircle, EyeOff } from 'lucide-react'

// La versione da una riga di «Stato del sito», per la scheda di un'entità nella
// Dashboard: si vede senza entrare da nessuna parte, e porta dove si risolve.
//
// Dice **la cosa che manca**, non un punteggio: «2 cose da sistemare» non aiuta
// nessuno se poi bisogna cercarle. Se è tutto a posto lo dice in una riga sola.
//
// ⚠️ Gli stessi dati del pannello grande (`/api/entita/[id]/stato-sito`): un
// secondo conteggio scritto qui finirebbe per dire una cosa diversa.

export default function StatoSitoBreve({ entityId, entityTipo, onApri }) {
  const [s, setS] = useState(null)
  const [fallito, setFallito] = useState(false)

  useEffect(() => {
    let vivo = true
    apiFetch(`/api/entita/${entityId}/stato-sito?tipo=${entityTipo}`)
      .then(d => vivo && setS(d))
      .catch(() => vivo && setFallito(true))
    return () => { vivo = false }
  }, [entityId, entityTipo])

  // Se non si riesce a leggere lo stato non si scrive niente: una riga che dice
  // «non lo so» occupa spazio e non aiuta.
  if (fallito || !s) return null

  // In ordine di importanza: la prima che manca è quella da fare adesso.
  const mancanze = [
    !s.pubblicato && 'da pubblicare',
    !s.indirizzo && 'senza indirizzo',
    s.blocchiHome === 0 && 'home vuota',
    !s.visibileAiMotori && 'non visibile su Google',
    !(s.titoloSeo && s.descrizioneSeo) && 'senza titolo o descrizione',
  ].filter(Boolean)

  const tutto = mancanze.length === 0
  const Icona = tutto ? CheckCircle2 : s.visibileAiMotori ? AlertCircle : EyeOff
  const colore = tutto ? '#2e7d32' : '#c77700'
  const testo = tutto
    ? 'Sito online e visibile su Google'
    : `Sito: ${mancanze[0]}${mancanze.length > 1 ? ` · +${mancanze.length - 1}` : ''}`

  return (
    <button onClick={onApri} title="Apri lo stato del sito"
      style={{
        display: 'flex', alignItems: 'center', gap: 7, width: '100%', marginTop: 12,
        padding: '8px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
        background: tutto ? '#f4faf5' : '#fffaf0',
        border: `1px solid ${tutto ? '#dcece0' : '#f0e0bd'}`,
      }}>
      <Icona size={14} strokeWidth={1.5} color={colore} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e', overflowWrap: 'anywhere' }}>{testo}</span>
    </button>
  )
}
