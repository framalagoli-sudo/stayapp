'use client'
import { useEffect, useState } from 'react'
import { HelpCircle, ChevronDown } from 'lucide-react'

// La guida della regia del Club: cosa si fa, in che ordine, e dove lo vede il
// cliente. Aperta la prima volta; chi la chiude la ritrova chiusa (nel suo
// browser), e la riapre con un clic.
const CHIAVE = 'club_guida_regia_chiusa'

const blocco = { background: '#fff', borderRadius: 10, padding: '12px 14px', border: '1px solid #e8e8ef' }
const titoletto = { fontSize: 13, fontWeight: 700, color: '#1a1a2e', margin: '0 0 6px' }
const testo = { fontSize: 13.5, color: '#333', lineHeight: 1.55, margin: 0 }

export default function GuidaRegia({ onVai }) {
  const [aperta, setAperta] = useState(true)
  useEffect(() => { try { setAperta(localStorage.getItem(CHIAVE) !== '1') } catch {} }, [])
  function cambia() {
    const ora = !aperta
    setAperta(ora)
    try { ora ? localStorage.removeItem(CHIAVE) : localStorage.setItem(CHIAVE, '1') } catch {}
  }

  return (
    <section data-guida-regia style={{ background: '#f6f7fb', borderRadius: 14, padding: aperta ? '16px 18px' : '10px 14px', marginBottom: 20, border: '1px solid #e3e5ee' }}>
      <button type="button" data-guida-apri onClick={cambia}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
        <HelpCircle size={18} strokeWidth={1.5} color="#1a1a2e" />
        <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>Come funziona la regia del Club</span>
        <span style={{ fontSize: 12.5, color: '#555' }}>{aperta ? 'Chiudi' : 'Apri la guida'}</span>
        <ChevronDown size={16} strokeWidth={1.5} color="#1a1a2e" style={{ transform: aperta ? 'rotate(180deg)' : 'none' }} />
      </button>

      {aperta && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 10, marginTop: 14 }}>
          <div style={blocco}>
            <p style={titoletto}>Due cose diverse, due schede</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
              <div>
                <p style={{ ...testo, fontWeight: 700 }}>📣 Contenuti: uguali per tutti</p>
                <p style={testo}>Occasioni («fra 10 giorni è Halloween»), strategie, il focus del periodo. Li scrivi una volta e li leggono tutti i clienti, o solo quelli di certi mestieri. Sono la tua consulenza «a tutti».</p>
                <p style={{ ...testo, color: '#555', marginTop: 4 }}>Il cliente li vede nella Dashboard, in «Oggi per te, dal Club», e nella pagina Club.</p>
                <button type="button" onClick={() => onVai?.('regia')} style={{ marginTop: 6, background: 'none', border: 'none', padding: 0, color: '#1d4ed8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Vai ai contenuti →</button>
              </div>
              <div>
                <p style={{ ...testo, fontWeight: 700 }}>💡 Consigli personali: dai numeri di ognuno</p>
                <p style={testo}>Non li scrivi per un cliente: scrivi una <b>regola</b> («quando un cliente ha almeno 10 iscritti e non manda newsletter da 45 giorni, digli questo»). Scattano da soli su chi si trova in quella situazione, coi suoi numeri.</p>
                <p style={{ ...testo, color: '#555', marginTop: 4 }}>Il cliente li vede nella Dashboard, in «Cosa fare adesso» (al massimo tre).</p>
                <button type="button" onClick={() => onVai?.('consigli')} style={{ marginTop: 6, background: 'none', border: 'none', padding: 0, color: '#1d4ed8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Vai ai consigli →</button>
              </div>
            </div>
          </div>

          <div style={blocco}>
            <p style={titoletto}>Un contenuto in 4 passi</p>
            <ol style={{ ...testo, paddingLeft: 18 }}>
              <li><b>Parti da un'occasione</b> del calendario (clic su «Prepara →») oppure da «+ Nuovo contenuto».</li>
              <li><b>Per chi</b>: «Tutti», oppure solo alcuni mestieri (Halloween → locali e ristoranti, non lo studio professionale).</li>
              <li><b>Scrivi l'idea in due righe</b> e premi «Scrivi la bozza con l'AI». Poi rileggi e correggi titolo e testo: la voce deve essere la tua.</li>
              <li><b>Pulsante e date</b>: dove porta il cliente per metterlo in pratica, e da quando a quando sta in vetrina. Poi <b>Pubblica</b>.</li>
            </ol>
          </div>

          <div style={blocco}>
            <p style={titoletto}>Un consiglio in 4 passi</p>
            <ol style={{ ...testo, paddingLeft: 18 }}>
              <li><b>Quando scatta</b>: scegli il segnale (es. «Iscritti a cui non si scrive») e regola le soglie.</li>
              <li><b>Cosa dice</b>: «Scrivi titolo e perché con l'AI». I numeri fra graffe, come <code>{'{persone}'}</code>, diventano i numeri di ogni cliente.</li>
              <li><b>«Su chi scatterebbe oggi?»</b>: vedi i clienti veri e la frase che leggerebbe ognuno. Se la frase suona male, correggila.</li>
              <li><b>Attiva</b>. Se vuoi pensarci, «Salva come bozza»: la vedi solo tu, con l'etichetta gialla, nella Dashboard delle aziende.</li>
            </ol>
          </div>

          <div style={blocco}>
            <p style={titoletto}>La tua routine: dieci minuti il lunedì</p>
            <ul style={{ ...testo, paddingLeft: 18 }}>
              <li>Guarda le <b>occasioni in arrivo</b>: prepara quelle delle prossime due o tre settimane.</li>
              <li>Ogni tanto una <b>strategia</b> o un <b>focus</b>: è quello che dici ai tuoi clienti in consulenza, scritto una volta.</li>
              <li>Accanto a ogni contenuto vedi 👁 <b>quante aziende l'hanno letto</b> e 👆 <b>quante hanno premuto il pulsante</b>: ti dice su cosa insistere.</li>
            </ul>
          </div>

          <div style={blocco}>
            <p style={titoletto}>Le parole della regia</p>
            <ul style={{ ...testo, paddingLeft: 18 }}>
              <li><b>Bozza</b>: la vedi solo tu. <b>Pubblica</b> (contenuti) / <b>Attiva</b> (consigli): la vedono i clienti.</li>
              <li><b>In vetrina dal / fino al</b>: i giorni in cui un contenuto compare in «Oggi per te». Dopo resta nell'archivio del Club.</li>
              <li><b>Mestieri</b>: le categorie delle attività (Locale con eventi, Ristorante…). «Tutti» = nessun filtro.</li>
              <li><b>Priorità</b> (consigli): se a un cliente ne scattano più di tre, vede quelli col numero più basso.</li>
              <li><b>Come lo vede un cliente</b>: scegli un'azienda dal menu in alto a sinistra e apri quella scheda.</li>
            </ul>
          </div>

          <p style={{ ...testo, fontSize: 12.5, color: '#555' }}>
            ⚠️ Quello che pubblichi o attivi lo leggono subito i clienti veri. Per provare, usa le bozze.
          </p>
        </div>
      )}
    </section>
  )
}
