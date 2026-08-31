// L'informativa privacy di OltreNova.
//
// ⚠️ Non esisteva. C'erano quelle dei clienti per i loro siti — generate dalla
// piattaforma — ma non la nostra, mentre raccogliamo email, dati aziendali e,
// come responsabili, i contatti dei clienti dei nostri clienti. È un obbligo,
// e la sua mancanza è saltata fuori solo perché i Termini ci puntavano.
//
// ⚠️ Bozza tecnica, non parere legale. La parte che richiede di conoscere il
// sistema — **quali fornitori toccano davvero i dati** — è scritta guardando
// `PROGETTO.md`, cioè la realtà: se domani se ne aggiunge uno, va aggiunto qui.
// La forma va fatta rivedere.

export const metadata = {
  title: 'Informativa privacy — OltreNova',
  description: 'Come OltreNova tratta i dati personali.',
}

const AGGIORNATO = '31 agosto 2026'

export default function Privacy() {
  return (
    <main style={pagina}>
      <h1 style={titolo}>Informativa privacy</h1>
      <p style={data}>Aggiornata al {AGGIORNATO}</p>

      <p style={p}>
        Questa informativa spiega come trattiamo i dati personali di chi usa{' '}
        <strong>OltreNova</strong>. È resa ai sensi degli articoli 13 e 14 del Regolamento
        UE 2016/679 (GDPR).
      </p>

      <Sezione n="1" t="Chi tratta i tuoi dati">
        <p style={p}>
          Titolare del trattamento: <strong>Francesco Malagoli</strong>, P.IVA 01630670550.
          Per qualsiasi richiesta: <a href="mailto:oltrenova@gmail.com" style={link}>oltrenova@gmail.com</a>
        </p>
      </Sezione>

      <Sezione n="2" t="Due situazioni diverse, e conviene distinguerle">
        <p style={{ ...p, ...rilievo }}>
          <strong>a) I tuoi dati di cliente OltreNova.</strong> Nome, email, dati dell’azienda,
          pagamenti dell’abbonamento. Qui il titolare siamo noi, e vale tutto quello che segue.
          <br /><br />
          <strong>b) I dati che raccogli tu attraverso la piattaforma.</strong> I contatti,
          le prenotazioni e gli ordini dei <em>tuoi</em> clienti. Di quelli{' '}
          <strong>il titolare sei tu</strong>: noi siamo responsabili del trattamento e li
          trattiamo soltanto per farti funzionare il servizio, secondo le tue istruzioni.
          Sei tu a doverli informare e a raccogliere i loro consensi.
        </p>
      </Sezione>

      <Sezione n="3" t="Quali dati raccogliamo e perché">
        <table style={tabella}>
          <thead>
            <tr><th style={th}>Dati</th><th style={th}>Perché</th><th style={th}>Base giuridica</th></tr>
          </thead>
          <tbody>
            <tr><td style={td}>Nome, email, password (cifrata), dati dell’azienda</td><td style={td}>Crearti l’account e farti usare il servizio</td><td style={td}>Esecuzione del contratto</td></tr>
            <tr><td style={td}>Dati di fatturazione e pagamento dell’abbonamento</td><td style={td}>Incassare quanto dovuto e adempiere agli obblighi fiscali</td><td style={td}>Contratto e obbligo di legge</td></tr>
            <tr><td style={td}>Accessi, indirizzo IP, registro delle azioni nel pannello</td><td style={td}>Sicurezza, prevenzione degli abusi, ricostruzione degli incidenti</td><td style={td}>Legittimo interesse</td></tr>
            <tr><td style={td}>Accettazione dei Termini: quando e quale versione</td><td style={td}>Poter dimostrare cosa è stato accettato</td><td style={td}>Obbligo di legge</td></tr>
            <tr><td style={td}>Email di servizio</td><td style={td}>Avvisi sul funzionamento, scadenze, problemi</td><td style={td}>Esecuzione del contratto</td></tr>
          </tbody>
        </table>
        <p style={p}>
          Non usiamo i tuoi dati per profilazione pubblicitaria e non li vendiamo a nessuno.
        </p>
      </Sezione>

      <Sezione n="4" t="Chi altro tocca i dati">
        <p style={p}>
          Per far funzionare il servizio ci appoggiamo a fornitori che agiscono come
          responsabili. Sono questi, e questo elenco è aggiornato:
        </p>
        <table style={tabella}>
          <thead><tr><th style={th}>Fornitore</th><th style={th}>A cosa serve</th><th style={th}>Dove</th></tr></thead>
          <tbody>
            <tr><td style={td}><strong>Supabase</strong></td><td style={td}>Database e autenticazione — è dove stanno i dati</td><td style={td}>UE</td></tr>
            <tr><td style={td}><strong>Vercel</strong></td><td style={td}>Esecuzione della piattaforma</td><td style={td}>UE / USA</td></tr>
            <tr><td style={td}><strong>Cloudflare</strong></td><td style={td}>Domini, protezione, archivio dei backup</td><td style={td}>UE / USA</td></tr>
            <tr><td style={td}><strong>Resend</strong></td><td style={td}>Invio delle email</td><td style={td}>UE / USA</td></tr>
            <tr><td style={td}><strong>Stripe</strong></td><td style={td}>Pagamenti. ⚠️ Per i tuoi incassi il rapporto è <strong>direttamente fra te e Stripe</strong>: noi non riceviamo quei dati di pagamento</td><td style={td}>UE / USA</td></tr>
            <tr><td style={td}><strong>Anthropic</strong></td><td style={td}>Funzioni di intelligenza artificiale, quando le usi</td><td style={td}>USA</td></tr>
          </tbody>
        </table>
        <p style={p}>
          Per i trasferimenti fuori dall’Unione Europea questi fornitori adottano le clausole
          contrattuali standard approvate dalla Commissione europea.
        </p>
      </Sezione>

      <Sezione n="5" t="Per quanto li teniamo">
        <ul style={lista}>
          <li>Finché il tuo account è attivo.</li>
          <li>Dopo la chiusura: <strong>30 giorni</strong>, per darti tempo di esportare tutto. Poi cancelliamo.</li>
          <li>I documenti fiscali per il tempo che la legge impone (10 anni).</li>
          <li>Le copie di sicurezza si sovrascrivono da sole entro 30 giorni.</li>
        </ul>
      </Sezione>

      <Sezione n="6" t="I tuoi diritti">
        <p style={p}>
          Puoi chiedere in qualsiasi momento di <strong>accedere</strong> ai tuoi dati,{' '}
          <strong>correggerli</strong>, <strong>cancellarli</strong>, <strong>limitarne</strong> il
          trattamento, <strong>portarli altrove</strong> o <strong>opporti</strong> a un
          trattamento fondato sul legittimo interesse.
        </p>
        <p style={p}>
          Molte di queste cose le puoi fare da solo dal pannello: i dati si esportano quando
          vuoi. Per il resto scrivi a{' '}
          <a href="mailto:oltrenova@gmail.com" style={link}>oltrenova@gmail.com</a>: rispondiamo
          entro 30 giorni.
        </p>
        <p style={p}>
          Se ritieni che il trattamento violi il GDPR puoi rivolgerti al{' '}
          <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" style={link}>Garante
          per la protezione dei dati personali</a>.
        </p>
      </Sezione>

      <Sezione n="7" t="Sicurezza">
        <p style={p}>
          I dati viaggiano cifrati, le password non sono leggibili nemmeno da noi, gli accessi
          sono protetti da un secondo fattore e le copie di sicurezza sono quotidiane e
          protette da cancellazione.
        </p>
        <p style={p}>
          Se dovesse verificarsi una violazione che comporta un rischio per i tuoi diritti,{' '}
          <strong>ti avvisiamo</strong> e informiamo il Garante entro 72 ore, come previsto.
        </p>
      </Sezione>

      <Sezione n="8" t="Cookie">
        <p style={p}>
          La piattaforma usa solo cookie <strong>tecnici</strong>, necessari a tenerti collegato
          e a far funzionare le pagine. Non usiamo cookie di profilazione e non tracciamo la tua
          navigazione a fini pubblicitari.
        </p>
      </Sezione>

      <Sezione n="9" t="Modifiche">
        <p style={p}>
          Se cambiamo qualcosa di rilevante — per esempio se si aggiunge un fornitore che tocca
          i dati — aggiorniamo questa pagina e te lo comunichiamo.
        </p>
      </Sezione>

      <p style={{ ...p, marginTop: 40, fontSize: 14, color: '#888' }}>
        Francesco Malagoli — P.IVA 01630670550 · <a href="/termini" style={link}>Termini di servizio</a> ·{' '}
        <a href="/" style={link}>Torna al sito</a>
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

const pagina  = { maxWidth: 760, margin: '0 auto', padding: '56px 24px 80px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#2d3748', lineHeight: 1.75 }
const titolo  = { fontSize: 34, fontWeight: 800, color: '#1a1a2e', margin: '0 0 6px', letterSpacing: -0.5 }
const data    = { fontSize: 14, color: '#999', margin: '0 0 8px' }
const h2      = { fontSize: 19, fontWeight: 700, color: '#1a1a2e', margin: '0 0 10px' }
const p       = { fontSize: 16, margin: '0 0 12px' }
const lista   = { fontSize: 16, margin: '0 0 12px', paddingLeft: 22 }
const link    = { color: '#1a1a2e', textDecoration: 'underline' }
const rilievo = { background: '#f7f9fc', borderLeft: '3px solid #1a1a2e', padding: '14px 16px', borderRadius: 4 }
// ⚠️ La tabella scorre da sola su schermo stretto: senza, allargherebbe tutta
// la pagina e il testo uscirebbe dal telefono.
const tabella = { width: '100%', borderCollapse: 'collapse', margin: '0 0 14px', fontSize: 14.5, display: 'block', overflowX: 'auto' }
const th      = { textAlign: 'left', padding: '9px 10px', borderBottom: '2px solid #e2e8f0', fontWeight: 700, color: '#1a1a2e', whiteSpace: 'nowrap' }
const td      = { textAlign: 'left', padding: '9px 10px', borderBottom: '1px solid #edf2f7', verticalAlign: 'top' }
