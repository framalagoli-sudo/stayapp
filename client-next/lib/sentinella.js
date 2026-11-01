import crypto from 'crypto'
import tls from 'tls'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase-server'
import { stripeConnect, stripeConfigurato } from '@/lib/stripe-connect'
import { sendEmail } from '@/lib/send-email'
import { platformEmailTemplate, html } from '@/lib/email-template'
import { chiaveAIFunziona } from '@/lib/ai-consumi'
import { TIPO_PROVA_SENTINELLA, INDIRIZZO_POZZO_SENTINELLA } from '@/lib/sentinella-regole'

// La sentinella dei fornitori: ogni mattina una prova vera ma innocua per ogni
// collegamento esterno da cui dipendiamo.
//
// Nasce da due guasti che non hanno fatto rumore: il webhook dei conti Stripe,
// rotto dal 31/08 al 23/10 perché Stripe aveva rinominato una funzione, e il
// webhook dei rimbalzi di Resend, muto 45 giorni. In tutti e due i casi nessun
// codice lanciava un errore: semplicemente non arrivava niente. Per accorgersene
// bisogna **provare il percorso intero**, come lo farebbe il fornitore.
//
// I cron fermi e il backup sono già sorvegliati da `cron-battito.js`: qui non si
// rifanno. Il database non ha una prova sua: se non risponde, la sentinella non
// lascia il suo battito e scatta l'allarme dei processi fermi.
//
// Una prova risponde { esito: 'ok' | 'guasto' | 'spenta', dettaglio, perche, cosaFare }.
// 'spenta' = non si può provare perché manca un pezzo che sappiamo mancare: si
// dice, ma non è un allarme (un allarme che suona sempre smette di essere letto).

const GIORNI_CERTIFICATO = 14
const ATTESA_MS = 10_000

// In sviluppo i webhook si provano sul server locale: le route sono le stesse,
// cambia solo l'indirizzo. In produzione si prova l'indirizzo registrato presso
// il fornitore, esattamente com'è — è lì che il guasto si vede (nota 27).
function indirizzoDaProvare(url) {
  if (process.env.NODE_ENV !== 'development') return url
  const u = new URL(url)
  return `http://localhost:3000${u.pathname}`
}

async function post(url, corpo, headers) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ATTESA_MS)
  try {
    const r = await fetch(indirizzoDaProvare(url), {
      method: 'POST', body: corpo, redirect: 'manual', signal: controller.signal,
      headers: { 'content-type': 'application/json', ...headers },
    })
    const testo = await r.text().catch(() => '')
    return { status: r.status, testo: testo.slice(0, 300) }
  } finally { clearTimeout(timer) }
}

// Un 3xx è un fallimento di consegna: i fornitori non seguono i redirect.
function rispostaGiusta(r) {
  if (r.status === 200) return null
  if (r.status >= 300 && r.status < 400) return `risponde ${r.status} (un rimando): il fornitore non lo segue e l'evento va perso`
  return `risponde ${r.status}: ${r.testo || 'nessun testo'}`
}

const suWww = url => { try { return new URL(url).hostname.startsWith('www.') } catch { return false } }

// ── Stripe ──────────────────────────────────────────────────────────────────

// Gli indirizzi registrati su Stripe, vecchio stile (v1) e nuovo (v2), con il
// loro stato. Stripe disattiva da solo un indirizzo dopo giorni di errori: è il
// modo in cui un guasto nostro diventa permanente senza che nessuno lo veda.
async function destinazioniStripe(stripe) {
  const v1 = (await stripe.webhookEndpoints.list({ limit: 50 })).data.map(e => ({
    url: e.url, attivo: e.status === 'enabled', eventi: e.enabled_events || [], sottile: false,
  }))
  const v2 = (await stripe.v2.core.eventDestinations.list({ limit: 50, include: ['webhook_endpoint.url'] })).data
    .filter(d => d.type === 'webhook_endpoint' || d.webhook_endpoint)
    .map(d => ({
      url: d.webhook_endpoint?.url || null, attivo: d.status === 'enabled',
      eventi: d.enabled_events || [], sottile: d.event_payload === 'thin',
    }))
  return [...v1, ...v2]
}

async function provaStripe() {
  if (!stripeConfigurato()) {
    return [{ nome: 'Stripe', esito: 'spenta', dettaglio: 'Stripe non è configurato su questo ambiente.' }]
  }
  const stripe = stripeConnect()
  let destinazioni
  try {
    destinazioni = await destinazioniStripe(stripe)
  } catch (e) {
    return [{
      nome: 'Chiave Stripe', esito: 'guasto', dettaglio: `Stripe rifiuta la chiave: ${e.message}`,
      perche: 'Senza chiave non si apre nessuna cassa: shop, eventi e prenotazioni non incassano.',
      cosaFare: 'Stripe → Sviluppatori → Chiavi API: controlla la chiave segreta e aggiornala su Vercel (STRIPE_SECRET_KEY).',
    }]
  }
  const prove = [{ nome: 'Chiave Stripe', esito: 'ok', dettaglio: 'Stripe risponde con la nostra chiave.' }]

  // Quali indirizzi devono esistere: uno per i pagamenti, uno sottile per lo
  // stato dei conti. Ognuno attivo e su www.
  const attese = [
    { nome: 'Webhook pagamenti (Stripe)', percorso: '/api/stripe/webhook', sottile: false, segreto: 'STRIPE_WEBHOOK_SECRET',
      perche: 'Chi paga resta «in attesa» per sempre e il titolare non sa che i soldi sono arrivati.' },
    { nome: 'Webhook conti collegati (Stripe)', percorso: '/api/stripe/webhook-account', sottile: true, segreto: 'STRIPE_ACCOUNT_WEBHOOK_SECRET',
      perche: 'Se Stripe blocca il conto di un cliente, non lo sappiamo: lo scopre lui dal primo pagamento rifiutato.' },
  ]

  for (const a of attese) {
    const trovate = destinazioni.filter(d => d.url && new URL(d.url).pathname === a.percorso)
    const registrata = trovate.find(d => d.attivo) || trovate[0]
    if (!registrata) {
      prove.push({ nome: a.nome, esito: 'guasto', dettaglio: `Su Stripe non c'è nessun indirizzo registrato per ${a.percorso}.`,
        perche: a.perche, cosaFare: 'Stripe → Sviluppatori → Webhook: registra l\'indirizzo su www.oltrenova.com, «eventi da account connessi».' })
      continue
    }
    if (!registrata.attivo) {
      prove.push({ nome: a.nome, esito: 'guasto', dettaglio: `Stripe ha disattivato ${registrata.url}.`,
        perche: a.perche, cosaFare: 'Stripe → Sviluppatori → Webhook: guarda gli ultimi tentativi falliti, correggi la causa e riattivalo.' })
      continue
    }
    if (!suWww(registrata.url)) {
      prove.push({ nome: a.nome, esito: 'guasto', dettaglio: `È registrato su ${registrata.url}, senza www: lì risponde un rimando e la consegna fallisce.`,
        perche: a.perche, cosaFare: 'Stripe → Sviluppatori → Webhook: cambia l\'indirizzo in www.oltrenova.com.' })
      continue
    }

    // Il percorso intero: un evento di prova firmato col nostro segreto, sullo
    // stesso indirizzo. Avrebbe trovato il guasto del 31/08 il giorno dopo.
    const segreto = (process.env[a.segreto] ?? '').trim()
    if (!segreto) {
      prove.push({ nome: a.nome, esito: 'guasto', dettaglio: `Manca ${a.segreto} su questo ambiente.`,
        perche: a.perche, cosaFare: `Copia il segreto di firma da Stripe e mettilo su Vercel (${a.segreto}).` })
      continue
    }
    const corpo = JSON.stringify(a.sottile
      ? { id: `evt_sentinella_${Date.now()}`, object: 'v2.core.event', type: TIPO_PROVA_SENTINELLA, created: new Date().toISOString() }
      : { id: `evt_sentinella_${Date.now()}`, object: 'event', type: TIPO_PROVA_SENTINELLA, data: { object: {} } })
    const firma = await stripe.webhooks.generateTestHeaderStringAsync({ payload: corpo, secret: segreto })
    try {
      const r = await post(registrata.url, corpo, { 'stripe-signature': firma })
      const male = rispostaGiusta(r)
      prove.push(male
        ? { nome: a.nome, esito: 'guasto', dettaglio: `Un evento firmato col nostro segreto ${male}.`, perche: a.perche,
            cosaFare: 'È codice nostro o il segreto su Vercel: guarda il deploy più recente e i Runtime Logs della route.' }
        : { nome: a.nome, esito: 'ok', dettaglio: 'Registrato, attivo, e un evento firmato attraversa la route.' })
    } catch (e) {
      prove.push({ nome: a.nome, esito: 'guasto', dettaglio: `L'indirizzo non risponde: ${e.message}`, perche: a.perche,
        cosaFare: 'Apri l\'indirizzo da un browser: se non risponde, è giù il sito.' })
    }
  }
  return prove
}

// ── Resend ──────────────────────────────────────────────────────────────────

function firmaSvix(segreto, id, quando, corpo) {
  const chiave = Buffer.from(segreto.replace('whsec_', ''), 'base64')
  const firma = crypto.createHmac('sha256', chiave).update(`${id}.${quando}.${corpo}`).digest('base64')
  return `v1,${firma}`
}

const PERCHE_RIMBALZI = 'Le email inesistenti non vengono più segnate: si continua a scrivere a caselle morte e la reputazione del dominio peggiora.'

async function provaResend() {
  const prove = []
  const chiave = (process.env.RESEND_API_KEY ?? '').trim()
  if (!chiave) return [{ nome: 'Resend', esito: 'spenta', dettaglio: 'RESEND_API_KEY non è configurata su questo ambiente.' }]

  // Dove Resend consegna gli eventi, letto da Resend. Se la chiave non ha il
  // permesso di leggerlo, si prova l'indirizzo che sappiamo registrato.
  let indirizzo = 'https://www.oltrenova.com/api/resend-webhook'
  let nota = ''
  try {
    const { data, error } = await new Resend(chiave).webhooks.list()
    if (error) throw new Error(error.message)
    const nostri = (data?.data || []).filter(w => { try { return new URL(w.endpoint).pathname === '/api/resend-webhook' } catch { return false } })
    const w = nostri.find(x => x.status === 'enabled') || nostri[0]
    if (!w) {
      prove.push({ nome: 'Webhook dei rimbalzi (Resend)', esito: 'guasto', dettaglio: 'Su Resend non c\'è nessun webhook verso /api/resend-webhook.',
        perche: PERCHE_RIMBALZI, cosaFare: 'Resend → Webhooks: aggiungi https://www.oltrenova.com/api/resend-webhook con email.bounced ed email.complained.' })
      return prove
    }
    if (w.status !== 'enabled') {
      prove.push({ nome: 'Webhook dei rimbalzi (Resend)', esito: 'guasto', dettaglio: `Resend ha disattivato ${w.endpoint}.`,
        perche: PERCHE_RIMBALZI, cosaFare: 'Resend → Webhooks: guarda i tentativi falliti, correggi la causa e riattivalo.' })
      return prove
    }
    const eventi = w.events || []
    if (!eventi.includes('email.bounced')) {
      prove.push({ nome: 'Webhook dei rimbalzi (Resend)', esito: 'guasto', dettaglio: 'Il webhook non è iscritto a email.bounced.',
        perche: PERCHE_RIMBALZI, cosaFare: 'Resend → Webhooks: aggiungi l\'evento email.bounced.' })
      return prove
    }
    indirizzo = w.endpoint
  } catch (e) {
    nota = ` (lo stato su Resend non si legge con questa chiave: ${e.message})`
  }

  if (!suWww(indirizzo)) {
    prove.push({ nome: 'Webhook dei rimbalzi (Resend)', esito: 'guasto', dettaglio: `È registrato su ${indirizzo}, senza www: lì risponde un rimando e Resend non lo segue.`,
      perche: PERCHE_RIMBALZI, cosaFare: 'Resend → Webhooks: cambia l\'indirizzo in www.oltrenova.com.' })
  } else {
    const segreto = (process.env.RESEND_WEBHOOK_SECRET ?? '').trim()
    if (!segreto) {
      prove.push({ nome: 'Webhook dei rimbalzi (Resend)', esito: 'guasto', dettaglio: 'Manca RESEND_WEBHOOK_SECRET su questo ambiente.',
        perche: PERCHE_RIMBALZI, cosaFare: 'Copia il segreto di firma da Resend → Webhooks e mettilo su Vercel.' })
    } else {
      const corpo = JSON.stringify({ type: TIPO_PROVA_SENTINELLA, created_at: new Date().toISOString(), data: {} })
      const id = `msg_sentinella_${Date.now()}`
      const quando = String(Math.floor(Date.now() / 1000))
      try {
        const r = await post(indirizzo, corpo, { 'svix-id': id, 'svix-timestamp': quando, 'svix-signature': firmaSvix(segreto, id, quando, corpo) })
        const male = rispostaGiusta(r)
        prove.push(male
          ? { nome: 'Webhook dei rimbalzi (Resend)', esito: 'guasto', dettaglio: `Un evento firmato col nostro segreto ${male}.`, perche: PERCHE_RIMBALZI,
              cosaFare: 'Controlla RESEND_WEBHOOK_SECRET su Vercel e il deploy più recente.' }
          : { nome: 'Webhook dei rimbalzi (Resend)', esito: 'ok', dettaglio: `Un evento firmato attraversa la route${nota}.` })
      } catch (e) {
        prove.push({ nome: 'Webhook dei rimbalzi (Resend)', esito: 'guasto', dettaglio: `L'indirizzo non risponde: ${e.message}`, perche: PERCHE_RIMBALZI,
          cosaFare: 'Apri l\'indirizzo da un browser: se non risponde, è giù il sito.' })
      }
    }
  }

  // Un invio vero, all'indirizzo pozzo di Resend (non arriva a nessuno). La
  // consegna torna dal webhook e lascia il battito `consegna-posta`: se smette
  // di arrivare, lo dice l'allarme dei processi fermi.
  const r = await sendEmail({
    _ctx: 'sentinella', to: INDIRIZZO_POZZO_SENTINELLA,
    subject: 'Sentinella OltreNova — prova di invio',
    html: '<p>Prova automatica: questa email va al pozzo di Resend e non arriva a nessuno.</p>',
  })
  prove.push(r?.error
    ? { nome: 'Invio email (Resend)', esito: 'guasto', dettaglio: `Resend rifiuta l'invio: ${r.error.message || 'errore'}`,
        perche: 'Non parte nessuna email: conferme di prenotazione, newsletter, recupero password, allarmi.',
        cosaFare: 'Resend → Domains e Logs: controlla che il dominio sia verificato e la chiave valida.' }
    : { nome: 'Invio email (Resend)', esito: 'ok', dettaglio: 'Resend accetta l\'invio.' })

  const { data: consegna } = await supabaseAdmin.from('cron_battiti').select('ultimo_ok').eq('nome', 'consegna-posta').maybeSingle()
  if (!consegna) {
    prove.push({ nome: 'Conferma di consegna (Resend)', esito: 'spenta',
      dettaglio: 'Nessuna conferma di consegna è mai arrivata: il webhook non è iscritto a email.delivered.' })
  }
  return prove
}

// ── Certificati ─────────────────────────────────────────────────────────────

function scadenzaCertificato(host) {
  return new Promise(resolve => {
    const s = tls.connect({ host, port: 443, servername: host, timeout: ATTESA_MS }, () => {
      const c = s.getPeerCertificate()
      s.end()
      resolve(c?.valid_to ? { scade: new Date(c.valid_to) } : { errore: 'nessun certificato' })
    })
    s.on('timeout', () => { s.destroy(); resolve({ errore: 'non risponde' }) })
    s.on('error', e => resolve({ errore: e.message }))
  })
}

async function provaCertificati() {
  const { data, error } = await supabaseAdmin.from('domini').select('dominio').eq('stato', 'attivo')
  if (error) return [{ nome: 'Certificati dei domini', esito: 'guasto', dettaglio: `Non riesco a leggere i domini: ${error.message}`,
    perche: 'Senza elenco non si controllano i certificati.', cosaFare: 'Guarda i Runtime Logs del cron sentinella.' }]
  const host = [...new Set(['www.oltrenova.com', ...(data || []).map(d => d.dominio)])]
  const esiti = await Promise.all(host.map(async h => ({ h, ...(await scadenzaCertificato(h)) })))

  const prove = []
  for (const e of esiti) {
    if (e.errore) {
      prove.push({ nome: `Certificato ${e.h}`, esito: 'guasto', dettaglio: `La connessione sicura non si apre: ${e.errore}.`,
        perche: 'Chi apre il sito riceve un errore di sicurezza del browser.', cosaFare: 'Pannello → Domini: guarda la diagnosi di questo indirizzo.' })
      continue
    }
    const giorni = Math.floor((e.scade.getTime() - Date.now()) / 86_400_000)
    if (giorni < GIORNI_CERTIFICATO) {
      prove.push({ nome: `Certificato ${e.h}`, esito: 'guasto', dettaglio: `Scade fra ${giorni} giorni: il rinnovo automatico non è andato.`,
        perche: 'Alla scadenza il sito diventa irraggiungibile.', cosaFare: 'Vercel → Domains: controlla il rinnovo di questo indirizzo.' })
    }
  }
  if (!prove.length) prove.push({ nome: 'Certificati dei domini', esito: 'ok', dettaglio: `${host.length} indirizzi, nessuno in scadenza entro ${GIORNI_CERTIFICATO} giorni.` })
  return prove
}

// ── AI ──────────────────────────────────────────────────────────────────────

async function provaAI() {
  const r = await chiaveAIFunziona()
  if (r.ok) return [{ nome: 'Chiave AI (Anthropic)', esito: 'ok', dettaglio: 'Anthropic risponde con la nostra chiave.' }]
  if (r.spenta) return [{ nome: 'Chiave AI (Anthropic)', esito: 'spenta', dettaglio: r.motivo }]
  return [{ nome: 'Chiave AI (Anthropic)', esito: 'guasto', dettaglio: r.motivo,
    perche: 'L\'AI è ferma per tutti i clienti: editor, assistente del sito, traduzioni.',
    cosaFare: 'Console Anthropic: controlla la chiave e il limite di spesa, poi aggiorna ANTHROPIC_API_KEY su Vercel.' }]
}

// ── Il giro ─────────────────────────────────────────────────────────────────

// Una prova che lancia non deve fermare le altre: diventa un guasto suo.
async function senzaCrollare(nome, fn) {
  try { return await fn() } catch (e) {
    return [{ nome, esito: 'guasto', dettaglio: `La prova stessa è fallita: ${e.message}`,
      perche: 'Non sappiamo se il collegamento funziona.', cosaFare: 'Guarda i Runtime Logs del cron sentinella.' }]
  }
}

export async function giroSentinella() {
  const gruppi = await Promise.all([
    senzaCrollare('Stripe', provaStripe),
    senzaCrollare('Resend', provaResend),
    senzaCrollare('Certificati', provaCertificati),
    senzaCrollare('Chiave AI', provaAI),
  ])
  return gruppi.flat()
}

const destinatarioAllarmi = () => (process.env.ERROR_ALERT_EMAIL || process.env.DEMO_NOTIFY_EMAIL || '').trim()

// L'email del giro. Di norma parte solo se qualcosa non va; `prova` la manda
// comunque, con tutte le prove, per vedere com'è fatta.
export async function mandaResoconto(prove, { prova = false } = {}) {
  const guasti = prove.filter(p => p.esito === 'guasto')
  const a = destinatarioAllarmi()
  if (!a || (!guasti.length && !prova)) return { inviata: false }

  const elenco = (prova ? prove : guasti).map(p => p.esito === 'guasto'
    ? html`<p style="margin:0 0 16px"><strong>✕ ${p.nome}</strong> — ${p.dettaglio}<br><em>Perché conta:</em> ${p.perche || ''}<br><em>Cosa fare:</em> ${p.cosaFare || ''}</p>`
    : html`<p style="margin:0 0 10px">${p.esito === 'ok' ? '✓' : '○'} <strong>${p.nome}</strong> — ${p.dettaglio}</p>`)

  const oggetto = guasti.length
    ? `⚠️ Sentinella: ${guasti.length} ${guasti.length === 1 ? 'prova non passata' : 'prove non passate'}`
    : '✓ Sentinella: tutte le prove passate'
  const r = await sendEmail({
    _ctx: 'sentinella-resoconto', to: a,
    subject: prova ? `[Prova] ${oggetto}` : oggetto,
    html: platformEmailTemplate({
      title: 'Sentinella dei fornitori',
      intro: prova
        ? 'Giro fatto partire dal pannello. Ogni mattina questa email arriva solo se qualcosa non va.'
        : 'Il giro di stamattina ha trovato qualcosa che non va.',
      bodyHtml: html`${elenco}`,
      footerNote: 'Prove automatiche, ogni mattina. ○ = non provabile oggi, non è un guasto.',
    }),
  })
  return { inviata: !r?.error, destinatario: a }
}
