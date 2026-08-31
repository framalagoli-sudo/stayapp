// I Termini di servizio di OltreNova.
//
// ⚠️ **Questa è una bozza tecnica, non un parere legale.** È scritta perché
// rispecchia com'è fatto davvero il sistema — chi incassa, dove stanno i dati,
// cosa succede se un cliente se ne va — e quella parte la sa solo chi l'ha
// costruito. La forma giuridica va fatta rivedere a un avvocato: un contratto
// SaaS italiano ha vincoli (codice del consumo, clausole vessatorie da
// approvare specificamente, foro competente) su cui non si improvvisa.
//
// Il punto che rende questo documento necessario adesso: dal 31/08/2026 i
// clienti incassano denaro dai loro clienti passando dalla piattaforma. Da
// qualche parte deve essere scritto che quel denaro non è nostro e che il
// rapporto è fra loro e Stripe. Tecnicamente è già così; ma davanti a una
// contestazione vale ciò che è scritto, non com'è configurato un account.

export const metadata = {
  title: 'Termini di servizio — OltreNova',
  description: 'Le condizioni di utilizzo della piattaforma OltreNova.',
}

const AGGIORNATO = '31 agosto 2026'

export default function Termini() {
  return (
    <main style={pagina}>
      <h1 style={titolo}>Termini di servizio</h1>
      <p style={data}>In vigore dal {AGGIORNATO}</p>

      <p style={p}>
        Questi termini regolano l’uso di <strong>OltreNova</strong>, la piattaforma software
        fornita da Francesco Malagoli, P.IVA 01630670550 (di seguito «noi»). Usando la
        piattaforma accetti quanto segue. Se sottoscrivi per conto di un’azienda, dichiari di
        averne il potere.
      </p>

      <Sezione n="1" t="Cosa forniamo">
        <p style={p}>
          OltreNova è un <strong>software in abbonamento</strong>. Ti diamo gli strumenti per
          costruire il tuo sito, gestire contatti, prenotazioni, eventi, un catalogo e, se lo
          attivi, vendere online.
        </p>
        <p style={p}>
          <strong>Non vendiamo nulla ai tuoi clienti e non siamo parte dei tuoi contratti.</strong>{' '}
          Quello che offri, a chi lo offri e a quali condizioni lo decidi tu.
        </p>
      </Sezione>

      <Sezione n="2" t="L’abbonamento">
        <p style={p}>
          L’accesso è a pagamento secondo il piano concordato. Le funzioni disponibili possono
          cambiare nel tempo: aggiungiamo cose e, più raramente, ne togliamo. Se togliamo
          qualcosa che stai usando, te lo diciamo prima.
        </p>
        <p style={p}>
          In caso di mancato pagamento possiamo sospendere l’accesso, dopo averti avvisato. I
          tuoi dati restano disponibili per l’esportazione per almeno <strong>30 giorni</strong>.
        </p>
      </Sezione>

      <Sezione n="3" t="I pagamenti che ricevi dai tuoi clienti">
        {/* ⛔ La sezione per cui esiste questo documento. */}
        <p style={{ ...p, ...rilievo }}>
          Se attivi gli incassi online, apri un <strong>tuo</strong> conto presso{' '}
          <strong>Stripe</strong>. I pagamenti dei tuoi clienti avvengono su quel conto e
          arrivano direttamente a te.
        </p>
        <p style={p}>
          <strong>Noi non riceviamo, non deteniamo e non trasferiamo quel denaro</strong>, e non
          tratteniamo alcuna commissione sulle tue vendite. Le commissioni di incasso sono
          quelle di Stripe e le paghi tu, direttamente a loro.
        </p>
        <p style={p}>
          Il rapporto sui pagamenti è <strong>fra te e Stripe</strong>, e accetti separatamente
          le loro condizioni durante l’attivazione. Restano a tuo carico: la consegna di quanto
          vendi, i resi, i rimborsi, le contestazioni di pagamento, gli obblighi fiscali e ogni
          verifica che Stripe dovesse richiederti.
        </p>
        <p style={p}>
          Stripe può chiederti documenti anche dopo l’attivazione e, se non li fornisci,
          sospendere i tuoi incassi. Non è una decisione nostra e non possiamo ribaltarla.
        </p>
      </Sezione>

      <Sezione n="4" t="Cosa ti chiediamo">
        <ul style={lista}>
          <li>Di usare la piattaforma per un’attività lecita e di rispettare le leggi che ti riguardano.</li>
          <li>Di custodire le tue credenziali e di attivare il secondo fattore di accesso.</li>
          <li>Di avere i diritti sui contenuti che carichi — testi, foto, marchi.</li>
          <li>Di informare correttamente i tuoi clienti sul trattamento dei loro dati.</li>
        </ul>
        <p style={p}>
          Non è consentito rivendere l’accesso a terzi, tentare di accedere ai dati di altri
          clienti, o usare la piattaforma per contenuti illeciti. In questi casi possiamo
          sospendere l’account, se necessario senza preavviso.
        </p>
      </Sezione>

      <Sezione n="5" t="I contenuti e chi ne è proprietario">
        <p style={p}>
          <strong>Quello che carichi resta tuo.</strong> Ci autorizzi soltanto a conservarlo e
          mostrarlo per far funzionare il servizio — per esempio a pubblicare le tue pagine.
        </p>
        <p style={p}>
          Il software, il suo codice e il marchio OltreNova restano nostri: l’abbonamento ti dà
          il diritto di usarlo, non di possederlo.
        </p>
        <p style={p}>
          Alcune funzioni usano l’<strong>intelligenza artificiale</strong> per generare testi o
          suggerimenti. Sono una bozza da rileggere: <strong>quello che pubblichi resta sotto la
          tua responsabilità</strong>, anche quando l’ha scritto una macchina.
        </p>
      </Sezione>

      <Sezione n="6" t="I tuoi dati">
        <p style={p}>
          I dati che raccogli — contatti, prenotazioni, ordini — sono tuoi. Rispetto al GDPR
          <strong> tu sei il titolare</strong> del trattamento e noi il responsabile: li trattiamo
          per farti funzionare il servizio e secondo le tue istruzioni.
        </p>
        <p style={p}>
          Puoi <strong>esportarli in qualsiasi momento</strong> dal pannello. Facciamo copie di
          sicurezza quotidiane, ma non sostituiscono un tuo archivio.
        </p>
        <p style={p}>
          Come trattiamo i dati è spiegato nella <a href="/privacy" style={link}>informativa privacy</a>.
        </p>
      </Sezione>

      <Sezione n="7" t="Disponibilità del servizio">
        <p style={p}>
          Lavoriamo perché la piattaforma sia sempre raggiungibile, ma{' '}
          <strong>non garantiamo un funzionamento ininterrotto</strong>. Ci sono manutenzioni,
          guasti e fornitori esterni — hosting, database, posta, pagamenti — che possono avere
          disservizi fuori dal nostro controllo.
        </p>
        <p style={p}>
          Se non hai sottoscritto un accordo scritto sui livelli di servizio, non ne esistono di
          impliciti. Preferiamo dirtelo invece di prometterti numeri che non possiamo mantenere.
        </p>
      </Sezione>

      <Sezione n="8" t="Responsabilità">
        <p style={p}>
          Rispondiamo del funzionamento del software nei limiti di legge. Non rispondiamo di:
        </p>
        <ul style={lista}>
          <li>quello che vendi e di come lo consegni;</li>
          <li>pagamenti, rimborsi e contestazioni, che riguardano te, i tuoi clienti e Stripe;</li>
          <li>mancati guadagni o perdite indirette;</li>
          <li>contenuti che hai pubblicato tu;</li>
          <li>disservizi di fornitori esterni.</li>
        </ul>
        <p style={p}>
          Nulla di quanto scritto qui esclude le responsabilità che la legge non permette di
          escludere.
        </p>
      </Sezione>

      <Sezione n="9" t="Durata e recesso">
        <p style={p}>
          Puoi smettere quando vuoi: l’abbonamento resta valido fino alla fine del periodo già
          pagato. Prima di andartene <strong>esporta i tuoi dati</strong>; dopo la chiusura li
          conserviamo per 30 giorni, poi li cancelliamo.
        </p>
        <p style={p}>
          Possiamo chiudere il tuo account con 30 giorni di preavviso, o immediatamente in caso
          di uso illecito o mancato pagamento prolungato.
        </p>
      </Sezione>

      <Sezione n="10" t="Modifiche">
        <p style={p}>
          Possiamo aggiornare questi termini. Se il cambiamento è rilevante te lo comunichiamo
          con almeno 30 giorni di anticipo; se non ti sta bene, puoi recedere senza penali.
        </p>
      </Sezione>

      <Sezione n="11" t="Legge applicabile">
        <p style={p}>
          Si applica la legge italiana. Per le controversie è competente il foro del luogo in cui
          abbiamo sede, salvo quanto la legge stabilisca diversamente per i consumatori.
        </p>
      </Sezione>

      <Sezione n="12" t="Contatti">
        <p style={p}>
          Per qualsiasi cosa: <a href="mailto:oltrenova@gmail.com" style={link}>oltrenova@gmail.com</a>
        </p>
      </Sezione>

      <p style={{ ...p, marginTop: 40, fontSize: 14, color: '#888' }}>
        Francesco Malagoli — P.IVA 01630670550 · <a href="/privacy" style={link}>Privacy</a> ·{' '}
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

const pagina = { maxWidth: 760, margin: '0 auto', padding: '56px 24px 80px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#2d3748', lineHeight: 1.75 }
const titolo = { fontSize: 34, fontWeight: 800, color: '#1a1a2e', margin: '0 0 6px', letterSpacing: -0.5 }
const data   = { fontSize: 14, color: '#999', margin: '0 0 8px' }
const h2     = { fontSize: 19, fontWeight: 700, color: '#1a1a2e', margin: '0 0 10px' }
const p      = { fontSize: 16, margin: '0 0 12px' }
const lista  = { fontSize: 16, margin: '0 0 12px', paddingLeft: 22 }
const link   = { color: '#1a1a2e', textDecoration: 'underline' }
const rilievo = { background: '#f7f9fc', borderLeft: '3px solid #1a1a2e', padding: '14px 16px', borderRadius: 4 }
