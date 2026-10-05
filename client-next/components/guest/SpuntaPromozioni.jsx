'use client'
import { testoConsensoPromozioni } from '@/lib/consenso-promozioni'

// «Avvisatemi delle prossime serate»: la casella con cui chi prenota dice che
// vuole essere invitato anche dopo. Facoltativa, mai già spuntata, separata da
// quella della privacy. La frase viene da `lib/consenso-promozioni.js`, la
// stessa che la route salva come prova.
//
// Una sola per tutti i moduli (evento, lista d'attesa, risorse, offerte, sito e
// app del QR): sei copie della stessa casella sono sei frasi che col tempo
// smettono di essere uguali.
export default function SpuntaPromozioni({ tipo = 'altro', lingua = 'it', checked, onChange, style = {}, accento = undefined }) {
  return (
    <label data-spunta-promozioni style={{ display: 'flex', alignItems: 'flex-start', gap: 9, cursor: 'pointer', fontSize: 13, lineHeight: 1.5, ...style }}>
      <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)}
        style={{ marginTop: 2, flexShrink: 0, accentColor: accento }} />
      <span>{testoConsensoPromozioni(tipo, lingua)}</span>
    </label>
  )
}
