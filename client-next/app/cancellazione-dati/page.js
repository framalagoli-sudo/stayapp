// Come chiedere la cancellazione dei dati ricevuti tramite Meta.
//
// Meta la pretende da ogni app che usa l'accesso con Facebook: nelle
// impostazioni dell'app va indicato o un indirizzo con le istruzioni, o un
// endpoint che riceve la richiesta firmata. Si parte dalle istruzioni, che non
// hanno bisogno di codice; l'endpoint arriverà con il collegamento vero.
//
// ⚠️ Ogni frase qui descrive quello che il sistema FA OGGI, non quello che farà:
// scollegare WhatsApp cancella subito collegamento, token e modelli di messaggio
// (`DELETE /api/whatsapp/connect`), mentre lo storico delle campagne resta. Se
// il comportamento cambia, questa pagina va aggiornata insieme.
//
// Stesso titolare, stessa email e stessi tempi dell'informativa (/privacy):
// due pagine che dicono cose diverse valgono meno di una.
//
// ⚠️ Bozza tecnica, non parere legale: rientra nella revisione dell'avvocato.

export const metadata = {
  alternates: { canonical: '/cancellazione-dati' },
  title: 'Cancellazione dei dati — OltreNova',
  description: 'Come chiedere la cancellazione dei dati ricevuti da Facebook, Instagram e WhatsApp.',
}

const AGGIORNATO = '15 settembre 2026'
const EMAIL = 'oltrenova@gmail.com'

export default function CancellazioneDati() {
  return (
    <main style={pagina}>
      <h1 style={titolo}>Cancellazione dei dati</h1>
      <p style={data}>Aggiornata al {AGGIORNATO}</p>

      <p style={p}>
        Questa pagina spiega come chiedere la cancellazione dei dati che <strong>OltreNova</strong>{' '}
        riceve quando un’attività collega a OltreNova i propri account Meta: Facebook,
        Instagram e WhatsApp.
      </p>

      <Sezione n="1" t="Quali dati riceviamo da Meta">
        <p style={p}>
          Solo quelli che servono al collegamento che hai scelto di attivare, e solo per gli
          account che hai autorizzato durante l’accesso:
        </p>
        <ul style={lista}>
          <li>gli identificativi degli account collegati (per esempio il numero WhatsApp e il suo account aziendale);</li>
          <li>la chiave di accesso che Meta rilascia per agire a nome della tua attività, conservata cifrata e mai mostrata nel browser;</li>
          <li>lo stato dei messaggi inviati tramite la piattaforma (consegnato, letto, non consegnato).</li>
        </ul>
        <p style={p}>
          Non riceviamo la tua password di Facebook, né i dati della carta con cui paghi Meta.
        </p>
      </Sezione>

      <Sezione n="2" t="Come chiedere la cancellazione">
        <p style={p}><strong>Dal pannello OltreNova.</strong> Scollegando l’account WhatsApp
          dalla pagina WhatsApp, cancelliamo subito il collegamento, la chiave di accesso e i
          modelli di messaggio creati sul tuo account. Lo storico delle campagne già inviate
          resta nel pannello finché non chiedi di cancellarlo.</p>
        <p style={p}><strong>Da Facebook.</strong> Puoi togliere a OltreNova l’accesso ai tuoi
          account dalle impostazioni di Facebook, nella sezione delle app e dei siti collegati.
          Da quel momento la chiave che avevamo smette di funzionare.</p>
        <p style={p}><strong>Per email.</strong> Per cancellare tutto — compreso lo storico —
          scrivi a <a href={`mailto:${EMAIL}?subject=Cancellazione%20dati%20Meta`} style={link}>{EMAIL}</a>{' '}
          con oggetto «Cancellazione dati Meta», indicando il nome della tua attività e
          l’account da cui scrivi.</p>
      </Sezione>

      <Sezione n="3" t="Entro quanto">
        <p style={{ ...p, ...rilievo }}>
          Rispondiamo e completiamo la cancellazione <strong>entro 30 giorni</strong> dalla
          richiesta, e ti confermiamo per email quando è fatta.
        </p>
        <p style={p}>
          Le copie di sicurezza si sovrascrivono da sole entro 30 giorni: dopo quel termine i
          dati cancellati non esistono più nemmeno lì.
        </p>
      </Sezione>

      <Sezione n="4" t="Per tutto il resto">
        <p style={p}>
          Il trattamento dei dati personali nel suo insieme — chi è il titolare, per quali
          finalità, con quali fornitori e quali sono i tuoi diritti — è descritto
          nell’<a href="/privacy" style={link}>informativa privacy</a>.
        </p>
      </Sezione>

      <p style={{ ...p, marginTop: 40, fontSize: 14, color: '#888' }}>
        Francesco Malagoli — P.IVA 01630670550 · <a href="/privacy" style={link}>Privacy</a> ·{' '}
        <a href="/termini" style={link}>Termini di servizio</a> · <a href="/" style={link}>Torna al sito</a>
      </p>
    </main>
  )
}

function Sezione({ n, t, children }) {
  return (
    <section style={{ marginTop: 34 }}>
      <h2 style={h2}>{n}. {t}</h2>
      {children}
    </section>
  )
}

// Stessi stili dell'informativa: sono pagine sorelle e devono sembrarlo.
const pagina  = { maxWidth: 760, margin: '0 auto', padding: '56px 24px 80px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#2d3748', lineHeight: 1.75 }
const titolo  = { fontSize: 34, fontWeight: 800, color: '#1a1a2e', margin: '0 0 6px', letterSpacing: -0.5 }
const data    = { fontSize: 14, color: '#999', margin: '0 0 8px' }
const h2      = { fontSize: 19, fontWeight: 700, color: '#1a1a2e', margin: '0 0 10px' }
const p       = { fontSize: 16, margin: '0 0 12px' }
const lista   = { fontSize: 16, margin: '0 0 12px', paddingLeft: 22 }
const link    = { color: '#1a1a2e', textDecoration: 'underline' }
const rilievo = { background: '#f7f9fc', borderLeft: '3px solid #1a1a2e', padding: '14px 16px', borderRadius: 4 }
