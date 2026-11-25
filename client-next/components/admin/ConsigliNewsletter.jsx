'use client'
import { useMemo, useState } from 'react'
import { AlertCircle, Lightbulb, CheckCircle, ChevronDown } from 'lucide-react'
import { consigliNewsletter } from '@/lib/newsletter-consigli'

// «Come arriva nella casella»: consigli che si aggiornano mentre si scrive, e
// sotto il perché delle newsletter nella scheda «Promozioni» di Gmail.
// Sono suggerimenti: non fermano niente.
export default function ConsigliNewsletter({ subject, preheader, content }) {
  const consigli = useMemo(() => consigliNewsletter({ subject, preheader, content }), [subject, preheader, content])
  const [aperto, setAperto] = useState(false)

  return (
    <div data-consigli-newsletter>
      {consigli.length === 0 ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: '#276749', lineHeight: 1.5 }}>
          <CheckCircle size={15} strokeWidth={1.5} color="#38a169" style={{ flexShrink: 0, marginTop: 2 }} />
          <span>Niente da segnalare: oggetto, testo e link hanno l’aria di una lettera, non di un volantino.</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {consigli.map(c => {
            const attenzione = c.livello === 'attenzione'
            const Icona = attenzione ? AlertCircle : Lightbulb
            return (
              <div key={c.chiave} data-consiglio={c.chiave} style={{
                display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, lineHeight: 1.5,
                color: attenzione ? '#744210' : '#2d3748',
                background: attenzione ? '#fffbeb' : '#f7fafc',
                border: `1px solid ${attenzione ? '#f6e05e' : '#e2e8f0'}`,
                borderRadius: 8, padding: '8px 12px',
              }}>
                <Icona size={15} strokeWidth={1.5} color={attenzione ? '#b7791f' : '#4a5568'} style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{c.testo}</span>
              </div>
            )
          })}
        </div>
      )}

      <button type="button" onClick={() => setAperto(a => !a)} aria-expanded={aperto} style={{
        display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, padding: 0, background: 'none', border: 'none',
        cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#2b6cb0', textAlign: 'left',
      }}>
        <ChevronDown size={14} strokeWidth={1.5} style={{ transform: aperto ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
        Perché le newsletter finiscono in «Promozioni»
      </button>
      {aperto && (
        <div style={{ fontSize: 13, color: '#4a5568', lineHeight: 1.6, marginTop: 10 }}>
          <p style={{ margin: '0 0 10px' }}>
            «Promozioni» non è lo spam: è Gmail che ordina la posta. L’email arriva, in un’altra scheda, e viene aperta lo stesso.
            Nessuno può garantire di evitarla: Gmail la riconosce perché parte a tante persone insieme e ha l’aspetto di una pubblicità.
          </p>
          <p style={{ margin: '0 0 6px', fontWeight: 700, color: '#2d3748' }}>Cosa aiuta davvero</p>
          <ul style={{ margin: '0 0 10px', paddingLeft: 18 }}>
            <li><strong>Chiedilo a chi la riceve.</strong> Chi trascina la tua email in «Principale» e risponde sì a «fallo per i messaggi futuri» le riceverà tutte lì. Scrivilo nella prima newsletter: «spostaci in Principale per non perdere le prossime».</li>
            <li><strong>Fatti rispondere.</strong> Una domanda alla fine («Che serata vorresti la prossima volta?») porta risposte, e chi risponde smette di vederti come pubblicità.</li>
            <li><strong>Scrivi come una persona.</strong> Più testo che foto, un solo invito chiaro, un oggetto che dice la cosa concreta. Il modello «Semplice» è il più vicino a una lettera.</li>
          </ul>
          <p style={{ margin: 0 }}>
            Il link per annullare l’iscrizione resta sempre: lo pretendono Gmail e Yahoo, e senza le email finirebbero nello spam.
            Per sapere se la newsletter funziona guarda i clic in «Com’è andata», non la scheda in cui è arrivata.
          </p>
        </div>
      )}
    </div>
  )
}
