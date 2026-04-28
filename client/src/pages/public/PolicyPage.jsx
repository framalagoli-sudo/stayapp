import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiFetch } from '../../lib/api'

// type: 'privacy' | 'cookie'
// entityType: 'struttura' | 'ristorante' | 'attivita'
export default function PolicyPage({ type, entityType }) {
  const { slug } = useParams()
  const [entity, setEntity] = useState(null)
  const [error, setError] = useState(null)

  const apiPath = entityType === 'struttura'
    ? `/api/guest/${slug}`
    : entityType === 'ristorante'
    ? `/api/guest/r/${slug}`
    : `/api/guest/a/${slug}`

  useEffect(() => {
    apiFetch(apiPath).then(setEntity).catch(() => setError(true))
  }, [slug])

  if (error) return <ErrorPage />
  if (!entity) return <LoadingPage />

  const p = { ...DEFAULT_PRIVACY, ...(entity.privacy_data || {}) }
  const primary = entity.theme?.primaryColor || '#1a1a2e'

  if (type === 'cookie') return <CookiePolicyContent entity={entity} p={p} primary={primary} />
  return <PrivacyPolicyContent entity={entity} p={p} primary={primary} entityType={entityType} />
}

const DEFAULT_PRIVACY = {
  titolare_nome: '',
  titolare_forma_giuridica: '',
  titolare_piva: '',
  titolare_cf: '',
  titolare_indirizzo: '',
  titolare_citta: '',
  titolare_cap: '',
  titolare_provincia: '',
  titolare_email: '',
  titolare_telefono: '',
  dpo_nome: '',
  dpo_email: '',
  usa_form_contatti: false,
  usa_newsletter: false,
  usa_richieste_ospiti: false,
  usa_prenotazioni: false,
  hosting_provider: '',
  email_provider: '',
}

const oggi = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })

function titolare(p, entity) {
  const parts = [
    p.titolare_nome || entity.name,
    p.titolare_forma_giuridica,
    p.titolare_piva ? `P.IVA ${p.titolare_piva}` : '',
    p.titolare_indirizzo,
    [p.titolare_cap, p.titolare_citta, p.titolare_provincia ? `(${p.titolare_provincia})` : ''].filter(Boolean).join(' '),
    p.titolare_email || entity.email,
    p.titolare_telefono || entity.phone,
  ].filter(Boolean)
  return parts
}

function PrivacyPolicyContent({ entity, p, primary, entityType }) {
  const tit = titolare(p, entity)
  const entityLabel = entityType === 'struttura' ? 'struttura ricettiva' : entityType === 'ristorante' ? 'ristorante' : 'attività'
  const pwaPrefix = entityType === 'struttura' ? 's' : entityType === 'ristorante' ? 'r' : 'a'
  const cookieUrl = `${window.location.origin}/${pwaPrefix}/${entity.slug}/cookie`

  return (
    <PageShell entity={entity} primary={primary} title="Privacy Policy">
      <Section title="1. Titolare del trattamento">
        <p>Il Titolare del trattamento dei dati personali è:</p>
        <address style={{ fontStyle: 'normal', lineHeight: 2 }}>
          {tit.map((t, i) => <span key={i}>{t}<br /></span>)}
        </address>
        {p.dpo_email && (
          <>
            <p style={{ marginTop: 16 }}><strong>Responsabile della Protezione dei Dati (DPO):</strong></p>
            <p>{p.dpo_nome && `${p.dpo_nome} — `}<a href={`mailto:${p.dpo_email}`}>{p.dpo_email}</a></p>
          </>
        )}
      </Section>

      <Section title="2. Tipologie di dati raccolti">
        <p>In base ai servizi attivi, questa {entityLabel} raccoglie le seguenti categorie di dati personali:</p>
        <ul>
          {p.usa_form_contatti && (
            <li><strong>Form di contatto:</strong> nome, indirizzo email, numero di telefono (opzionale), messaggio libero.</li>
          )}
          {p.usa_newsletter && (
            <li><strong>Iscrizione newsletter:</strong> nome, indirizzo email, numero di telefono (opzionale).</li>
          )}
          {p.usa_richieste_ospiti && (
            <li><strong>Richieste ospiti (app):</strong> numero di camera/stanza, tipologia di richiesta, messaggio libero. Non sono richiesti dati identificativi obbligatori.</li>
          )}
          {p.usa_prenotazioni && (
            <li><strong>Prenotazioni:</strong> dati forniti nell'ambito del processo di prenotazione (nome, email, telefono, date di soggiorno o servizio).</li>
          )}
          <li><strong>Dati di navigazione tecnici:</strong> indirizzi IP, tipo di browser, pagine visitate, ora della visita — raccolti automaticamente dal server di hosting ai fini di sicurezza e diagnosi tecnica. Non sono associati a utenti identificati.</li>
        </ul>
        {!p.usa_form_contatti && !p.usa_newsletter && !p.usa_richieste_ospiti && !p.usa_prenotazioni && (
          <p>Al momento non vengono raccolti dati personali tramite moduli attivi. Sono presenti esclusivamente dati di navigazione tecnici come indicato sopra.</p>
        )}
      </Section>

      <Section title="3. Finalità e base giuridica del trattamento">
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={thStyle}>Finalità</th>
              <th style={thStyle}>Base giuridica (art. 6 GDPR)</th>
            </tr>
          </thead>
          <tbody>
            {p.usa_form_contatti && (
              <tr>
                <td style={tdStyle}>Rispondere alle richieste di contatto</td>
                <td style={tdStyle}>Art. 6(1)(b) — esecuzione di un contratto o misure precontrattuali</td>
              </tr>
            )}
            {p.usa_newsletter && (
              <tr>
                <td style={tdStyle}>Invio di comunicazioni promozionali e newsletter</td>
                <td style={tdStyle}>Art. 6(1)(a) — consenso dell'interessato</td>
              </tr>
            )}
            {p.usa_richieste_ospiti && (
              <tr>
                <td style={tdStyle}>Gestione richieste durante il soggiorno</td>
                <td style={tdStyle}>Art. 6(1)(b) — esecuzione del contratto di ospitalità</td>
              </tr>
            )}
            {p.usa_prenotazioni && (
              <tr>
                <td style={tdStyle}>Gestione prenotazioni</td>
                <td style={tdStyle}>Art. 6(1)(b) — esecuzione del contratto</td>
              </tr>
            )}
            <tr>
              <td style={tdStyle}>Sicurezza e diagnosi tecnica del sistema</td>
              <td style={tdStyle}>Art. 6(1)(f) — legittimo interesse del titolare</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="4. Conservazione dei dati">
        <ul>
          {p.usa_form_contatti && <li><strong>Dati da form contatto:</strong> conservati per il tempo strettamente necessario a gestire la richiesta e, ove instaurato un rapporto contrattuale, per 10 anni ai fini fiscali e contabili.</li>}
          {p.usa_newsletter && <li><strong>Dati newsletter:</strong> conservati fino alla revoca del consenso da parte dell'interessato. La disiscrizione è disponibile in ogni comunicazione inviata.</li>}
          {p.usa_richieste_ospiti && <li><strong>Dati richieste ospiti:</strong> conservati per la durata del soggiorno e per un massimo di 12 mesi successivi per finalità di qualità del servizio.</li>}
          <li><strong>Log tecnici:</strong> conservati per un massimo di 30 giorni.</li>
        </ul>
      </Section>

      <Section title="5. Destinatari dei dati">
        <p>I dati personali possono essere comunicati alle seguenti categorie di destinatari, nella qualità di Responsabili del trattamento ex art. 28 GDPR:</p>
        <ul>
          <li><strong>Fornitore di hosting e database:</strong> server certificati localizzati all'interno dello Spazio Economico Europeo — trattamento necessario all'erogazione del servizio digitale.</li>
          {(p.usa_form_contatti || p.usa_newsletter) && (
            <li><strong>Fornitore invio email:</strong> servizio di invio email transazionale — utilizzato per inviare notifiche e comunicazioni agli indirizzi forniti.</li>
          )}
        </ul>
        <p>I dati non vengono venduti, ceduti o comunicati a terzi per finalità commerciali proprie di questi ultimi.</p>
        <p><strong>Trasferimento extra-UE:</strong> I dati vengono elaborati all'interno dello Spazio Economico Europeo (SEE). Eventuali trasferimenti verso paesi terzi avvengono nel rispetto delle garanzie previste dagli artt. 44-49 GDPR.</p>
      </Section>

      <Section title="6. Diritti dell'interessato">
        <p>In qualità di interessato, hai il diritto di:</p>
        <ul>
          <li><strong>Accesso (art. 15):</strong> ottenere conferma del trattamento e copia dei dati.</li>
          <li><strong>Rettifica (art. 16):</strong> correggere dati inesatti o incompleti.</li>
          <li><strong>Cancellazione ("diritto all'oblio", art. 17):</strong> ottenere la cancellazione dei dati, salvo obblighi di legge.</li>
          <li><strong>Limitazione (art. 18):</strong> richiedere la limitazione del trattamento in determinati casi.</li>
          <li><strong>Portabilità (art. 20):</strong> ricevere i tuoi dati in formato strutturato e leggibile da macchina.</li>
          <li><strong>Opposizione (art. 21):</strong> opporsi al trattamento basato su legittimo interesse.</li>
          {p.usa_newsletter && <li><strong>Revoca del consenso (art. 7):</strong> revocare in qualsiasi momento il consenso prestato per la newsletter, senza pregiudicare la liceità del trattamento precedente.</li>}
        </ul>
        <p>Per esercitare i tuoi diritti, invia una richiesta a: <a href={`mailto:${p.titolare_email || entity.email}`}>{p.titolare_email || entity.email}</a></p>
        <p>Hai inoltre il diritto di proporre reclamo al <strong>Garante per la protezione dei dati personali</strong> (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">www.garanteprivacy.it</a>), Piazza Venezia 11, 00187 Roma.</p>
      </Section>

      <Section title="7. Cookie">
        <p>Per informazioni dettagliate sui cookie utilizzati da questo sito, consulta la nostra <a href={cookieUrl}>Cookie Policy</a>.</p>
      </Section>

      <Section title="8. Modifiche alla presente informativa">
        <p>
          Il Titolare si riserva il diritto di modificare questa informativa in qualsiasi momento.
          Le modifiche saranno pubblicate su questa pagina con aggiornamento della data indicata di seguito.
          Si consiglia di consultare periodicamente questa pagina.
        </p>
        <p><strong>Ultimo aggiornamento:</strong> {oggi}</p>
      </Section>
    </PageShell>
  )
}

function CookiePolicyContent({ entity, p, primary }) {
  return (
    <PageShell entity={entity} primary={primary} title="Cookie Policy">
      <p style={{ color: '#666', marginBottom: 32 }}>
        Questa Cookie Policy descrive i cookie e le tecnologie di tracciamento utilizzate da questo sito web,
        in conformità con il Provvedimento del Garante Privacy italiano dell'8 maggio 2014 e le successive
        Linee guida del 10 giugno 2021, nonché con il GDPR (Reg. UE 2016/679).
      </p>

      <Section title="1. Cosa sono i cookie">
        <p>
          I cookie sono piccoli file di testo che i siti web visitati dall'utente inviano al suo terminale
          (computer, tablet, smartphone), dove vengono memorizzati per essere poi ritrasmessi agli stessi siti
          alla visita successiva. I cookie permettono a un sito di riconoscere il dispositivo dell'utente.
        </p>
        <p>
          Questo sito utilizza esclusivamente lo storage locale del browser (localStorage) — una tecnologia
          analoga ai cookie — e non installa cookie di profilazione di terze parti.
        </p>
      </Section>

      <Section title="2. Tipologie di cookie utilizzati">
        <h4 style={{ margin: '0 0 8px', fontSize: 15 }}>2.1 Cookie tecnici (necessari)</h4>
        <p>
          Questi cookie sono strettamente necessari al funzionamento del sito e non richiedono il consenso
          dell'utente ai sensi dell'art. 122 del Codice Privacy e delle Linee guida del Garante.
        </p>
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={thStyle}>Nome / Chiave</th>
              <th style={thStyle}>Tipo</th>
              <th style={thStyle}>Finalità</th>
              <th style={thStyle}>Durata</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}><code>cookie_consent</code></td>
              <td style={tdStyle}>localStorage</td>
              <td style={tdStyle}>Memorizza la scelta dell'utente riguardo ai cookie (accettato / rifiutato)</td>
              <td style={tdStyle}>Persistente (fino alla cancellazione manuale)</td>
            </tr>
            {p.usa_richieste_ospiti && (
              <tr>
                <td style={tdStyle}><code>requests_[id]</code></td>
                <td style={tdStyle}>localStorage</td>
                <td style={tdStyle}>Memorizza lo storico delle richieste effettuate durante il soggiorno per mostrarne lo stato aggiornato</td>
                <td style={tdStyle}>Sessione (rimosso automaticamente)</td>
              </tr>
            )}
          </tbody>
        </table>

        <h4 style={{ margin: '24px 0 8px', fontSize: 15 }}>2.2 Cookie analitici</h4>
        <p>Questo sito <strong>non utilizza</strong> cookie analitici (es. Google Analytics) né strumenti di tracciamento del comportamento degli utenti.</p>

        <h4 style={{ margin: '24px 0 8px', fontSize: 15 }}>2.3 Cookie di profilazione e marketing</h4>
        <p>Questo sito <strong>non utilizza</strong> cookie di profilazione o marketing di terze parti.</p>
      </Section>

      <Section title="3. Come gestire i cookie">
        <p>L'utente può gestire le preferenze relative ai cookie attraverso:</p>
        <ul>
          <li><strong>Banner cookie:</strong> al primo accesso al sito viene mostrato un banner che consente di accettare o rifiutare i cookie non essenziali. La scelta può essere modificata cancellando i dati del sito nelle impostazioni del browser.</li>
          <li>
            <strong>Impostazioni del browser:</strong> la maggior parte dei browser consente di gestire i cookie tramite le impostazioni. Di seguito i link alle istruzioni dei browser più diffusi:
            <ul style={{ marginTop: 8 }}>
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/it/kb/gestione-dei-cookie" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/it-it/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Apple Safari</a></li>
              <li><a href="https://support.microsoft.com/it-it/microsoft-edge/eliminare-i-cookie-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
            </ul>
          </li>
        </ul>
        <p>La disabilitazione dei cookie tecnici potrebbe compromettere alcune funzionalità del sito.</p>
      </Section>

      <Section title="4. Titolare del trattamento">
        <p>Il Titolare del trattamento è:</p>
        <address style={{ fontStyle: 'normal', lineHeight: 2 }}>
          {titolare(p, entity).map((t, i) => <span key={i}>{t}<br /></span>)}
        </address>
        <p style={{ marginTop: 12 }}>Per qualsiasi richiesta relativa ai cookie, contatta: <a href={`mailto:${p.titolare_email || entity.email}`}>{p.titolare_email || entity.email}</a></p>
      </Section>

      <Section title="5. Aggiornamenti">
        <p>
          Questa Cookie Policy potrebbe essere aggiornata per riflettere eventuali modifiche alle tecnologie
          utilizzate o alla normativa applicabile.
        </p>
        <p><strong>Ultimo aggiornamento:</strong> {oggi}</p>
      </Section>
    </PageShell>
  )
}

function PageShell({ entity, primary, title, children }) {
  const siteName = entity?.name || 'Sito'
  useEffect(() => { document.title = `${title} — ${siteName}` }, [title, siteName])

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Header */}
      <div style={{ background: primary, padding: '20px 24px', color: '#fff' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          {entity?.logo_url && (
            <img src={entity.logo_url} alt={siteName} style={{ maxHeight: 40, maxWidth: 120, objectFit: 'contain' }} />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{siteName}</div>
            <div style={{ fontSize: 13, opacity: 0.8 }}>{title}</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: '#1a1a2e' }}>{title}</h1>
        <p style={{ color: '#aaa', fontSize: 13, marginBottom: 40, borderBottom: '1px solid #eee', paddingBottom: 20 }}>
          Informativa ai sensi del Regolamento UE 2016/679 (GDPR) e del D.Lgs. 196/2003 come modificato dal D.Lgs. 101/2018
        </p>
        {children}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #eee', padding: '20px 24px', textAlign: 'center', fontSize: 12, color: '#aaa', background: '#fff' }}>
        © {new Date().getFullYear()} {siteName} — Powered by StayApp
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid #f0f0f0' }}>{title}</h2>
      <div style={{ fontSize: 15, color: '#333', lineHeight: 1.75 }}>{children}</div>
    </section>
  )
}

function ErrorPage() {
  return <div style={{ padding: 60, textAlign: 'center', color: '#e53e3e' }}>Pagina non trovata.</div>
}
function LoadingPage() {
  return <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>Caricamento…</div>
}

const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 14, marginTop: 8 }
const thStyle    = { padding: '10px 12px', textAlign: 'left', fontWeight: 700, fontSize: 13, border: '1px solid #eee' }
const tdStyle    = { padding: '10px 12px', border: '1px solid #eee', verticalAlign: 'top' }
