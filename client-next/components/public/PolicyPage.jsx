'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { guestFetch } from '@/lib/api'

// type: 'privacy' | 'cookie'
// entityType: 'struttura' | 'ristorante' | 'attivita'
// lang: 'it' | 'en'
export default function PolicyPage({ type, entityType, lang = 'it' }) {
  const { slug } = useParams()
  const [entity, setEntity] = useState(null)
  const [error, setError] = useState(null)

  const apiPath = entityType === 'struttura'
    ? `/api/guest/${slug}`
    : entityType === 'ristorante'
    ? `/api/guest/r/${slug}`
    : `/api/guest/a/${slug}`

  useEffect(() => {
    guestFetch(apiPath).then(setEntity).catch(() => setError(true))
  }, [slug])

  if (error) return <ErrorPage lang={lang} />
  if (!entity) return <LoadingPage lang={lang} />

  const p = { ...DEFAULT_PRIVACY, ...(entity.privacy_data || {}) }
  const primary = entity.theme?.primaryColor || '#1a1a2e'

  if (type === 'cookie') {
    return lang === 'en'
      ? <CookiePolicyContentEN entity={entity} p={p} primary={primary} />
      : <CookiePolicyContent entity={entity} p={p} primary={primary} />
  }
  return lang === 'en'
    ? <PrivacyPolicyContentEN entity={entity} p={p} primary={primary} entityType={entityType} />
    : <PrivacyPolicyContent entity={entity} p={p} primary={primary} entityType={entityType} />
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

function formatOggi(lang) {
  return new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
}

function titolare(p, entity, lang = 'it') {
  const parts = [
    p.titolare_nome || entity.name,
    p.titolare_forma_giuridica,
    p.titolare_piva ? `${lang === 'en' ? 'VAT no.' : 'P.IVA'} ${p.titolare_piva}` : '',
    p.titolare_indirizzo,
    [p.titolare_cap, p.titolare_citta, p.titolare_provincia ? `(${p.titolare_provincia})` : ''].filter(Boolean).join(' '),
    p.titolare_email || entity.email,
    p.titolare_telefono || entity.phone,
  ].filter(Boolean)
  return parts
}

/* ============================== ITALIANO ============================== */

function PrivacyPolicyContent({ entity, p, primary, entityType }) {
  const tit = titolare(p, entity)
  const oggi = formatOggi('it')
  const entityLabel = entityType === 'struttura' ? 'struttura ricettiva' : entityType === 'ristorante' ? 'ristorante' : 'attività'
  const pwaPrefix = entityType === 'struttura' ? 's' : entityType === 'ristorante' ? 'r' : 'a'
  const cookieUrl = `/${pwaPrefix}/${entity.slug}/cookie`

  return (
    <PageShell entity={entity} primary={primary} title="Privacy Policy" lang="it">
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
  const oggi = formatOggi('it')
  return (
    <PageShell entity={entity} primary={primary} title="Cookie Policy" lang="it">
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

/* ============================== ENGLISH ============================== */

function PrivacyPolicyContentEN({ entity, p, primary, entityType }) {
  const tit = titolare(p, entity, 'en')
  const oggi = formatOggi('en')
  const entityLabel = entityType === 'struttura' ? 'accommodation facility' : entityType === 'ristorante' ? 'restaurant' : 'business'
  const pwaPrefix = entityType === 'struttura' ? 's' : entityType === 'ristorante' ? 'r' : 'a'
  const cookieUrl = `/en/${pwaPrefix}/${entity.slug}/cookie`

  return (
    <PageShell entity={entity} primary={primary} title="Privacy Policy" lang="en">
      <Section title="1. Data Controller">
        <p>The Data Controller of personal data is:</p>
        <address style={{ fontStyle: 'normal', lineHeight: 2 }}>
          {tit.map((t, i) => <span key={i}>{t}<br /></span>)}
        </address>
        {p.dpo_email && (
          <>
            <p style={{ marginTop: 16 }}><strong>Data Protection Officer (DPO):</strong></p>
            <p>{p.dpo_nome && `${p.dpo_nome} — `}<a href={`mailto:${p.dpo_email}`}>{p.dpo_email}</a></p>
          </>
        )}
      </Section>

      <Section title="2. Categories of data collected">
        <p>Depending on the services in use, this {entityLabel} collects the following categories of personal data:</p>
        <ul>
          {p.usa_form_contatti && (
            <li><strong>Contact form:</strong> name, email address, phone number (optional), free-text message.</li>
          )}
          {p.usa_newsletter && (
            <li><strong>Newsletter subscription:</strong> name, email address, phone number (optional).</li>
          )}
          {p.usa_richieste_ospiti && (
            <li><strong>Guest requests (app):</strong> room/unit number, type of request, free-text message. No mandatory identifying data is required.</li>
          )}
          {p.usa_prenotazioni && (
            <li><strong>Bookings:</strong> data provided as part of the booking process (name, email, phone, stay or service dates).</li>
          )}
          <li><strong>Technical browsing data:</strong> IP addresses, browser type, pages visited, time of visit — collected automatically by the hosting server for security and technical diagnostic purposes. They are not associated with identified users.</li>
        </ul>
        {!p.usa_form_contatti && !p.usa_newsletter && !p.usa_richieste_ospiti && !p.usa_prenotazioni && (
          <p>At present no personal data is collected through active forms. Only technical browsing data is processed, as indicated above.</p>
        )}
      </Section>

      <Section title="3. Purposes and legal basis of processing">
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={thStyle}>Purpose</th>
              <th style={thStyle}>Legal basis (Art. 6 GDPR)</th>
            </tr>
          </thead>
          <tbody>
            {p.usa_form_contatti && (
              <tr>
                <td style={tdStyle}>Responding to contact requests</td>
                <td style={tdStyle}>Art. 6(1)(b) — performance of a contract or pre-contractual measures</td>
              </tr>
            )}
            {p.usa_newsletter && (
              <tr>
                <td style={tdStyle}>Sending promotional communications and newsletters</td>
                <td style={tdStyle}>Art. 6(1)(a) — consent of the data subject</td>
              </tr>
            )}
            {p.usa_richieste_ospiti && (
              <tr>
                <td style={tdStyle}>Handling requests during the stay</td>
                <td style={tdStyle}>Art. 6(1)(b) — performance of the hospitality contract</td>
              </tr>
            )}
            {p.usa_prenotazioni && (
              <tr>
                <td style={tdStyle}>Managing bookings</td>
                <td style={tdStyle}>Art. 6(1)(b) — performance of the contract</td>
              </tr>
            )}
            <tr>
              <td style={tdStyle}>System security and technical diagnostics</td>
              <td style={tdStyle}>Art. 6(1)(f) — legitimate interest of the controller</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="4. Data retention">
        <ul>
          {p.usa_form_contatti && <li><strong>Contact form data:</strong> retained for as long as strictly necessary to handle the request and, where a contractual relationship is established, for 10 years for tax and accounting purposes.</li>}
          {p.usa_newsletter && <li><strong>Newsletter data:</strong> retained until the data subject withdraws consent. Unsubscription is available in every communication sent.</li>}
          {p.usa_richieste_ospiti && <li><strong>Guest request data:</strong> retained for the duration of the stay and for a maximum of 12 months afterwards for service quality purposes.</li>}
          <li><strong>Technical logs:</strong> retained for a maximum of 30 days.</li>
        </ul>
      </Section>

      <Section title="5. Data recipients">
        <p>Personal data may be disclosed to the following categories of recipients, acting as Data Processors pursuant to Art. 28 GDPR:</p>
        <ul>
          <li><strong>Hosting and database provider:</strong> certified servers located within the European Economic Area — processing necessary to deliver the digital service.</li>
          {(p.usa_form_contatti || p.usa_newsletter) && (
            <li><strong>Email delivery provider:</strong> transactional email service — used to send notifications and communications to the addresses provided.</li>
          )}
        </ul>
        <p>Data is not sold, transferred or disclosed to third parties for their own commercial purposes.</p>
        <p><strong>Transfers outside the EU:</strong> Data is processed within the European Economic Area (EEA). Any transfers to third countries take place in compliance with the safeguards set out in Arts. 44-49 GDPR.</p>
      </Section>

      <Section title="6. Rights of the data subject">
        <p>As a data subject, you have the right to:</p>
        <ul>
          <li><strong>Access (Art. 15):</strong> obtain confirmation of processing and a copy of your data.</li>
          <li><strong>Rectification (Art. 16):</strong> correct inaccurate or incomplete data.</li>
          <li><strong>Erasure ("right to be forgotten", Art. 17):</strong> obtain the deletion of your data, subject to legal obligations.</li>
          <li><strong>Restriction (Art. 18):</strong> request the restriction of processing in certain cases.</li>
          <li><strong>Portability (Art. 20):</strong> receive your data in a structured, machine-readable format.</li>
          <li><strong>Objection (Art. 21):</strong> object to processing based on legitimate interest.</li>
          {p.usa_newsletter && <li><strong>Withdrawal of consent (Art. 7):</strong> withdraw at any time the consent given for the newsletter, without affecting the lawfulness of prior processing.</li>}
        </ul>
        <p>To exercise your rights, send a request to: <a href={`mailto:${p.titolare_email || entity.email}`}>{p.titolare_email || entity.email}</a></p>
        <p>You also have the right to lodge a complaint with the Italian <strong>Data Protection Authority</strong> (Garante per la protezione dei dati personali, <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">www.garanteprivacy.it</a>), Piazza Venezia 11, 00187 Rome, Italy.</p>
      </Section>

      <Section title="7. Cookies">
        <p>For detailed information about the cookies used by this website, please see our <a href={cookieUrl}>Cookie Policy</a>.</p>
      </Section>

      <Section title="8. Changes to this notice">
        <p>
          The Controller reserves the right to amend this notice at any time.
          Changes will be published on this page with an update to the date indicated below.
          You are advised to review this page periodically.
        </p>
        <p><strong>Last updated:</strong> {oggi}</p>
      </Section>
    </PageShell>
  )
}

function CookiePolicyContentEN({ entity, p, primary }) {
  const oggi = formatOggi('en')
  return (
    <PageShell entity={entity} primary={primary} title="Cookie Policy" lang="en">
      <p style={{ color: '#666', marginBottom: 32 }}>
        This Cookie Policy describes the cookies and tracking technologies used by this website,
        in compliance with the Italian Data Protection Authority's ruling of 8 May 2014 and the subsequent
        Guidelines of 10 June 2021, as well as with the GDPR (Reg. EU 2016/679).
      </p>

      <Section title="1. What cookies are">
        <p>
          Cookies are small text files that the websites visited by the user send to the user's device
          (computer, tablet, smartphone), where they are stored and then sent back to the same sites
          on the next visit. Cookies allow a website to recognise the user's device.
        </p>
        <p>
          This website uses only the browser's local storage (localStorage) — a technology similar to
          cookies — and does not install third-party profiling cookies.
        </p>
      </Section>

      <Section title="2. Types of cookies used">
        <h4 style={{ margin: '0 0 8px', fontSize: 15 }}>2.1 Technical cookies (necessary)</h4>
        <p>
          These cookies are strictly necessary for the website to function and do not require the user's
          consent pursuant to Art. 122 of the Italian Privacy Code and the Authority's Guidelines.
        </p>
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={thStyle}>Name / Key</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Purpose</th>
              <th style={thStyle}>Duration</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}><code>cookie_consent</code></td>
              <td style={tdStyle}>localStorage</td>
              <td style={tdStyle}>Stores the user's choice regarding cookies (accepted / rejected)</td>
              <td style={tdStyle}>Persistent (until manually deleted)</td>
            </tr>
            {p.usa_richieste_ospiti && (
              <tr>
                <td style={tdStyle}><code>requests_[id]</code></td>
                <td style={tdStyle}>localStorage</td>
                <td style={tdStyle}>Stores the history of requests made during the stay to show their updated status</td>
                <td style={tdStyle}>Session (removed automatically)</td>
              </tr>
            )}
          </tbody>
        </table>

        <h4 style={{ margin: '24px 0 8px', fontSize: 15 }}>2.2 Analytics cookies</h4>
        <p>This website <strong>does not use</strong> analytics cookies (e.g. Google Analytics) or tools that track user behaviour.</p>

        <h4 style={{ margin: '24px 0 8px', fontSize: 15 }}>2.3 Profiling and marketing cookies</h4>
        <p>This website <strong>does not use</strong> third-party profiling or marketing cookies.</p>
      </Section>

      <Section title="3. How to manage cookies">
        <p>The user can manage cookie preferences through:</p>
        <ul>
          <li><strong>Cookie banner:</strong> on first access to the website a banner is shown that allows non-essential cookies to be accepted or rejected. The choice can be changed by clearing the website data in the browser settings.</li>
          <li>
            <strong>Browser settings:</strong> most browsers allow cookies to be managed through their settings. Below are links to the instructions for the most common browsers:
            <ul style={{ marginTop: 8 }}>
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/en-us/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Apple Safari</a></li>
              <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
            </ul>
          </li>
        </ul>
        <p>Disabling technical cookies may compromise some website features.</p>
      </Section>

      <Section title="4. Data Controller">
        <p>The Data Controller is:</p>
        <address style={{ fontStyle: 'normal', lineHeight: 2 }}>
          {titolare(p, entity, 'en').map((t, i) => <span key={i}>{t}<br /></span>)}
        </address>
        <p style={{ marginTop: 12 }}>For any request relating to cookies, please contact: <a href={`mailto:${p.titolare_email || entity.email}`}>{p.titolare_email || entity.email}</a></p>
      </Section>

      <Section title="5. Updates">
        <p>
          This Cookie Policy may be updated to reflect any changes to the technologies used or to the
          applicable legislation.
        </p>
        <p><strong>Last updated:</strong> {oggi}</p>
      </Section>
    </PageShell>
  )
}

/* ============================== SHARED ============================== */

function PageShell({ entity, primary, title, children, lang = 'it' }) {
  const siteName = entity?.name || 'Sito'
  useEffect(() => { document.title = `${title} — ${siteName}` }, [title, siteName])
  const subtitle = lang === 'en'
    ? 'Information notice pursuant to Regulation (EU) 2016/679 (GDPR) and Italian Legislative Decree 196/2003 as amended by Legislative Decree 101/2018'
    : 'Informativa ai sensi del Regolamento UE 2016/679 (GDPR) e del D.Lgs. 196/2003 come modificato dal D.Lgs. 101/2018'

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
          {subtitle}
        </p>
        {children}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #eee', padding: '20px 24px', textAlign: 'center', fontSize: 12, color: '#aaa', background: '#fff' }}>
        © {new Date().getFullYear()} {siteName} — Powered by OltreNova
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

function ErrorPage({ lang = 'it' }) {
  return <div style={{ padding: 60, textAlign: 'center', color: '#e53e3e' }}>{lang === 'en' ? 'Page not found.' : 'Pagina non trovata.'}</div>
}
function LoadingPage({ lang = 'it' }) {
  return <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>{lang === 'en' ? 'Loading…' : 'Caricamento…'}</div>
}

const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 14, marginTop: 8 }
const thStyle    = { padding: '10px 12px', textAlign: 'left', fontWeight: 700, fontSize: 13, border: '1px solid #eee' }
const tdStyle    = { padding: '10px 12px', border: '1px solid #eee', verticalAlign: 'top' }
