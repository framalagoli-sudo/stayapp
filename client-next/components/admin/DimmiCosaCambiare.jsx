'use client'
import { useEffect, useRef, useState } from 'react'
import { Mic, Send } from 'lucide-react'

// «Dimmi cosa cambiare»: una riga dove si scrive — o si dice al microfono —
// cosa cambiare nella pagina. Il microfono è quello del browser (Web Speech):
// dove non c'è (Firefox) resta la riga da scrivere. La frase la interpreta
// l'editor (`onInvia`, che risponde true quando ha fatto qualcosa: allora la
// riga si svuota).
//
// ⚠️ In Chrome il riconoscimento della voce lo fa Google, in Safari Apple: a
// loro arriva l'audio di chi parla. Il testo riconosciuto arriva a noi come
// una frase scritta.
export default function DimmiCosaCambiare({ onInvia, lavora = false, errore = null, compatto = false }) {
  const [frase, setFrase] = useState('')
  const [ascolta, setAscolta] = useState(false)
  const [voce, setVoce] = useState(false)
  const [problema, setProblema] = useState(null)
  const riconosci = useRef(null)

  // Dopo il montaggio: il browser si conosce solo nel browser.
  useEffect(() => { setVoce(!!(window.SpeechRecognition || window.webkitSpeechRecognition)) }, [])
  useEffect(() => () => { try { riconosci.current?.abort() } catch {} }, [])

  async function invia(testo) {
    const t = String(testo || '').trim()
    if (t.length < 3 || lavora) return
    setProblema(null)
    if (await onInvia(t)) setFrase('')
  }

  function microfono() {
    if (ascolta) { try { riconosci.current?.stop() } catch {} return }
    const R = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!R) return
    const r = new R()
    r.lang = 'it-IT'
    r.interimResults = true
    r.continuous = false
    r.maxAlternatives = 1
    let detto = ''
    r.onresult = e => {
      detto = Array.from(e.results).map(x => x[0]?.transcript || '').join(' ').trim()
      setFrase(detto)
    }
    r.onerror = e => {
      setProblema(e.error === 'not-allowed' || e.error === 'service-not-allowed'
        ? 'Il microfono è bloccato: consentilo dal lucchetto accanto all\'indirizzo, oppure scrivi.'
        : e.error === 'no-speech' ? 'Non ho sentito niente: riprova, oppure scrivi.' : 'Il microfono non ha funzionato: scrivi pure.')
    }
    r.onend = () => { setAscolta(false); riconosci.current = null; if (detto) invia(detto) }
    riconosci.current = r
    setProblema(null); setFrase(''); setAscolta(true)
    try { r.start() } catch { setAscolta(false) }
  }

  const avviso = problema || errore
  return (
    <div data-dimmi style={{ width: '100%' }}>
      <form onSubmit={e => { e.preventDefault(); invia(frase) }}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: `1.5px solid ${ascolta ? '#e0245e' : '#c8d0e8'}`, borderRadius: 12, padding: compatto ? '4px 4px 4px 12px' : '5px 5px 5px 14px', boxShadow: compatto ? 'none' : '0 6px 24px rgba(26,26,46,0.16)' }}>
        <input value={frase} onChange={e => setFrase(e.target.value)} disabled={lavora} maxLength={500} aria-label="Dimmi cosa cambiare"
          placeholder={ascolta ? 'Ti ascolto…' : lavora ? 'Ci penso…' : compatto ? 'Dimmi cosa cambiare…' : 'Dimmi cosa cambiare — es. «sposta le recensioni sopra i prezzi»'}
          style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', fontSize: 14.5, padding: '8px 0', background: 'transparent', color: '#1a1a2e' }} />
        {voce && (
          <button type="button" onClick={microfono} disabled={lavora} data-microfono aria-label={ascolta ? 'Smetti di ascoltare' : 'Parla'} title={ascolta ? 'Smetti di ascoltare' : 'Dillo a voce'}
            style={{ width: 38, height: 38, borderRadius: 10, border: 'none', cursor: lavora ? 'default' : 'pointer', background: ascolta ? '#e0245e' : '#f0f0f4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Mic size={17} strokeWidth={1.5} color={ascolta ? '#fff' : '#1a1a2e'} />
          </button>
        )}
        <button type="submit" disabled={lavora || frase.trim().length < 3} aria-label="Fallo" title="Fallo (Invio)"
          style={{ width: 38, height: 38, borderRadius: 10, border: 'none', cursor: lavora || frase.trim().length < 3 ? 'default' : 'pointer', background: lavora || frase.trim().length < 3 ? '#e4e6f0' : '#5b6af8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {lavora
            ? <span style={{ width: 15, height: 15, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'dimmi-gira .8s linear infinite' }} />
            : <Send size={16} strokeWidth={1.5} color="#fff" />}
        </button>
      </form>
      {avviso && <div data-dimmi-errore style={{ marginTop: 6, fontSize: 12.5, color: '#b42318', background: '#fff', borderRadius: 8, padding: '5px 10px', lineHeight: 1.4 }}>{avviso}</div>}
      <style>{'@keyframes dimmi-gira { to { transform: rotate(360deg) } }'}</style>
    </div>
  )
}
