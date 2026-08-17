// Unico punto di contatto con l'API Vercel per i domini, più la normalizzazione
// e la diagnosi mostrate al cliente.
//
// Regola di fondo: i valori DNS NON si scrivono a mano nel codice. Vercel cambia gli
// IP di ingresso e li espone in /v6/domains/{d}/config; l'IP che era hardcodato qui
// (76.76.19.19) oggi non risponde più, quindi ogni cliente che seguiva le istruzioni
// alla lettera restava offline. Le istruzioni si chiedono sempre a Vercel.
const VERCEL_TOKEN      = process.env.VERCEL_TOKEN?.trim()
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID?.trim()

// Valori di ripiego usati SOLO se l'API Vercel non risponde: sono quelli che Vercel
// raccomanda oggi come rank 1 per un dominio esterno (verificati raggiungibili).
const FALLBACK_IPV4  = ['76.76.21.21']
const FALLBACK_CNAME = 'cname.vercel-dns.com'

export function vercelReady() {
  return !!(VERCEL_TOKEN && VERCEL_PROJECT_ID)
}

// ── Chiamate API ──────────────────────────────────────────────────────────────
// Non lancia mai: ritorna sempre { ok, status, data, error } così le route restano
// leggibili e un guasto di Vercel non diventa un 500 opaco per il cliente.
async function vercelFetch(path, { method = 'GET', body } = {}) {
  if (!vercelReady()) return { ok: false, status: 0, data: null, error: 'Vercel non configurato' }
  try {
    const res = await fetch(`https://api.vercel.com${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    })
    const data = await res.json().catch(() => null)
    if (data?.error) return { ok: false, status: res.status, data, error: data.error.message || data.error.code }
    return { ok: res.ok, status: res.status, data, error: res.ok ? null : `Vercel HTTP ${res.status}` }
  } catch (e) {
    return { ok: false, status: 0, data: null, error: e.name === 'TimeoutError' ? 'Vercel non risponde' : e.message }
  }
}

const projectPath = () => `/v10/projects/${VERCEL_PROJECT_ID}/domains`

// Aggiunge il dominio al progetto. `redirect` serve per il gemello apex/www.
// Se l'hostname risulta già in uso non ci fidiamo del testo del messaggio (Vercel
// ne usa più varianti, fra cui "one of your projects", che può voler dire un altro
// progetto dell'account): chiediamo se sta sul NOSTRO progetto. Se sì è un successo
// idempotente — capita rinominando un indirizzo e tornando poi a uno già usato.
export async function addProjectDomain(name, { redirect } = {}) {
  const r = await vercelFetch(projectPath(), { method: 'POST', body: { name, ...(redirect ? { redirect } : {}) } })
  if (r.ok || !/already in use|already exists|is already assigned/i.test(r.error || '')) return r

  const attuale = await getProjectDomain(name)
  if (attuale.ok && attuale.data?.name) return attuale
  return { ...r, error: `${name} è già collegato a un altro progetto` }
}

export async function getProjectDomain(name) {
  return await vercelFetch(`/v9/projects/${VERCEL_PROJECT_ID}/domains/${encodeURIComponent(name)}`)
}

export async function removeProjectDomain(name) {
  return await vercelFetch(`/v9/projects/${VERCEL_PROJECT_ID}/domains/${encodeURIComponent(name)}`, { method: 'DELETE' })
}

export async function verifyProjectDomain(name) {
  return await vercelFetch(`/v9/projects/${VERCEL_PROJECT_ID}/domains/${encodeURIComponent(name)}/verify`, { method: 'POST' })
}

// Cosa dice il DNS del dominio ADESSO + cosa Vercel raccomanda di impostare.
export async function getDnsConfig(name) {
  return await vercelFetch(`/v6/domains/${encodeURIComponent(name)}/config`)
}

// ── Prova end-to-end ──────────────────────────────────────────────────────────
// Vercel può dire "verified" e "misconfigured: false" mentre il sito è irraggiungibile,
// perché il certificato TLS per quell'hostname non è stato emesso (è il caso dei
// sottodomini coperti solo dal wildcard: handshake rifiutato, il visitatore vede 525).
// L'unica verifica che conta è chiamare l'indirizzo come farebbe un cliente.
export async function probeHttps(name) {
  try {
    const res = await fetch(`https://${name}/`, {
      method: 'GET',
      redirect: 'manual',
      cache: 'no-store',
      headers: { 'user-agent': 'StayApp-DomainCheck/1.0' },
      signal: AbortSignal.timeout(10000),
    })
    return { raggiungibile: true, status: res.status }
  } catch (e) {
    // Distinguiamo il caso tipico "TLS rifiutato" (certificato non ancora emesso)
    // dal DNS che non risolve: al cliente vanno dette due cose diverse.
    const msg = String(e.cause?.code || e.message || '')
    const causa = /ENOTFOUND|EAI_AGAIN|ERR_NAME/i.test(msg) ? 'dns'
      : /CERT|SSL|TLS|EPROTO|HANDSHAKE/i.test(msg) ? 'certificato'
      : e.name === 'TimeoutError' ? 'timeout' : 'rete'
    return { raggiungibile: false, causa, dettaglio: msg.slice(0, 120) }
  }
}

// ── Normalizzazione input ─────────────────────────────────────────────────────
// Il cliente incolla quello che ha sotto mano: "https://www.miosito.it/", "MioSito.it",
// "www.miosito.it ". Va normalizzato prima di qualsiasi controllo, altrimenti finisce
// nel DB spazzatura che poi non verificherà mai.
const HOST_VALIDO = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/
const TLD_NON_PUBBLICI = ['local', 'localhost', 'internal', 'test', 'invalid', 'example', 'lan', 'home', 'arpa']

export function normalizzaDominio(input) {
  let raw = String(input || '').trim().toLowerCase()
  if (!raw) return { error: 'Inserisci il tuo dominio' }

  // Punycode per i domini internazionali (caffè.it → xn--caff-8sa.it): senza questo
  // un dominio con accenti o caratteri non latini non funzionerebbe mai.
  try {
    raw = new URL(raw.includes('://') ? raw : `https://${raw}`).hostname
  } catch {
    return { error: 'Non riconosco questo indirizzo. Scrivilo come www.miosito.it' }
  }
  raw = raw.replace(/\.$/, '')

  if (/^\d+\.\d+\.\d+\.\d+$/.test(raw) || raw.includes(':')) {
    return { error: 'Serve un nome di dominio, non un indirizzo IP' }
  }
  if (!raw.includes('.')) return { error: 'Manca l’estensione: scrivi il dominio completo, es. miosito.it' }
  if (!HOST_VALIDO.test(raw)) return { error: 'Il dominio contiene caratteri non ammessi. Usa solo lettere, numeri e trattini' }
  if (TLD_NON_PUBBLICI.includes(raw.split('.').pop())) {
    return { error: 'Questo dominio non è raggiungibile da internet' }
  }
  if (raw.startsWith('*.')) return { error: 'I domini con jolly (*) non sono supportati' }
  return { dominio: raw }
}

// ── Apex o sottodominio ───────────────────────────────────────────────────────
// Sapere se un dominio è "radice" (miosito.it) o un sottodominio (www.miosito.it)
// decide il tipo di record DNS: A per la radice, CNAME per il resto. Non si può
// dedurre contando i punti — miosito.co.uk è una radice con due punti. La verità
// la sa Vercel (`apexName`, calcolato sulla Public Suffix List); l'euristica sotto
// è solo il ripiego se l'API non risponde.
const SUFFISSI_COMPOSTI = [
  'co.uk', 'org.uk', 'me.uk', 'ac.uk', 'gov.uk', 'com.au', 'net.au', 'org.au',
  'com.br', 'com.mx', 'com.ar', 'com.tr', 'co.nz', 'co.za', 'co.jp', 'co.in',
  'com.cn', 'com.sg', 'com.hk', 'co.kr', 'com.pl', 'com.ua', 'com.es', 'co.il',
]
export function apexDiRipiego(dominio) {
  const parti = dominio.split('.')
  const ultimiDue = parti.slice(-2).join('.')
  const n = SUFFISSI_COMPOSTI.includes(ultimiDue) ? 3 : 2
  return parti.slice(-n).join('.')
}

// Il gemello da registrare insieme al dominio scelto: chi collega miosito.it deve
// trovare online anche www.miosito.it (e viceversa), altrimenti metà dei suoi
// visitatori sbatte su un errore del browser.
export function gemelloDi(dominio, apexName) {
  const apex = apexName || apexDiRipiego(dominio)
  if (dominio === apex) return `www.${apex}`
  if (dominio === `www.${apex}`) return apex
  return null // sottodomini diversi da www non hanno gemello
}

// ── Istruzioni DNS ────────────────────────────────────────────────────────────
// Costruisce i record da mostrare al cliente partendo dai valori raccomandati da
// Vercel per QUEL dominio, non da costanti scritte qui.
export function recordDns(dominio, { apexName, config } = {}) {
  const apex = apexName || apexDiRipiego(dominio)
  const isApex = dominio === apex
  const ipv4 = config?.recommendedIPv4?.[0]?.value?.length ? config.recommendedIPv4[0].value : FALLBACK_IPV4
  const cname = (config?.recommendedCNAME?.[0]?.value || FALLBACK_CNAME).replace(/\.$/, '')

  if (isApex) {
    return ipv4.map(ip => ({ tipo: 'A', nome: '@', valore: ip, ttl: 'Auto' }))
  }
  const label = dominio.slice(0, -(apex.length + 1)) // "www" da "www.miosito.it"
  return [{ tipo: 'CNAME', nome: label, valore: cname, ttl: 'Auto' }]
}

// Record di verifica proprietà, richiesti da Vercel solo quando il dominio è già
// usato altrove (es. su un altro account Vercel).
export function recordVerifica(dominio, verification) {
  if (!verification?.length) return []
  return verification.map(v => ({
    tipo: v.type?.toUpperCase() || 'TXT',
    nome: v.domain || `_vercel.${dominio}`,
    valore: v.value || '',
  }))
}

// ── Riconoscimento provider ───────────────────────────────────────────────────
// I nameserver dicono chi gestisce il DNS del cliente: mandarlo direttamente alla
// pagina giusta vale più di dieci righe di spiegazione generica.
const PROVIDER = [
  { match: /cloudflare/i,               nome: 'Cloudflare',   url: 'https://dash.cloudflare.com', nota: 'Nella scheda DNS. Se il record ha la nuvoletta arancione, cliccala per farla diventare grigia (Proxy disattivato).' },
  { match: /aruba/i,                    nome: 'Aruba',        url: 'https://admin.aruba.it', nota: 'Pannello → Domini → Gestione DNS e Zona DNS.' },
  { match: /godaddy|domaincontrol/i,    nome: 'GoDaddy',      url: 'https://dcc.godaddy.com/manage/dns', nota: 'Prodotti → Dominio → Gestisci DNS.' },
  { match: /namecheap|registrar-servers/i, nome: 'Namecheap', url: 'https://ap.www.namecheap.com/domains/list', nota: 'Domain List → Manage → Advanced DNS.' },
  { match: /register\.it|technorail|dnsitalia/i, nome: 'Register.it', url: 'https://controlpanel.register.it', nota: 'Pannello → Domini → Gestione DNS.' },
  { match: /siteground/i,               nome: 'SiteGround',   url: 'https://login.siteground.com', nota: 'Site Tools → Domain → DNS Zone Editor.' },
  { match: /ionos|1and1|ui-dns/i,       nome: 'IONOS',        url: 'https://my.ionos.it', nota: 'Domini e SSL → Dominio → DNS.' },
  { match: /ovh/i,                      nome: 'OVH',          url: 'https://www.ovh.com/manager', nota: 'Web Cloud → Domini → Zona DNS.' },
  { match: /hostinger|hostinger-dns/i,  nome: 'Hostinger',    url: 'https://hpanel.hostinger.com', nota: 'Domini → Gestisci → Zona DNS.' },
  { match: /squarespace|domaincontrol/i, nome: 'Squarespace', url: 'https://account.squarespace.com/domains', nota: 'Domini → DNS.' },
  { match: /wixdns/i,                   nome: 'Wix',          url: 'https://www.wix.com/my-account/domains', nota: 'Domini → Avanzate → Record DNS.' },
  { match: /shopify/i,                  nome: 'Shopify',      url: 'https://admin.shopify.com', nota: 'Impostazioni → Domini.' },
  { match: /vercel-dns/i,               nome: 'Vercel',       url: 'https://vercel.com/domains', nota: 'Il dominio è già gestito da Vercel.' },
  { match: /google|googledomains/i,     nome: 'Google Domains / Squarespace', url: 'https://domains.squarespace.com', nota: 'I domini Google sono passati a Squarespace.' },
]
export function riconosciProvider(nameservers) {
  const testo = (nameservers || []).join(' ')
  if (!testo) return null
  const hit = PROVIDER.find(p => p.match.test(testo))
  if (hit) return { nome: hit.nome, url: hit.url, nota: hit.nota }
  // Provider non in elenco: mostriamo comunque il nameserver, aiuta a orientarsi.
  const host = (nameservers[0] || '').split('.').slice(-2).join('.')
  return host ? { nome: host, url: null, nota: null } : null
}

// ── Diagnosi completa ─────────────────────────────────────────────────────────
// Raccoglie stato Vercel + DNS reale + prova HTTPS e produce un verdetto unico,
// già in lingua umana, che UI e cron condividono.
//
// stato: 'attivo' | 'pending' | 'errore'
// fase:  'dns_mancante' | 'dns_errato' | 'certificato' | 'proprieta' | 'attivo'
export async function diagnosticaDominio(dominio) {
  const [progetto, cfg, prova] = await Promise.all([
    getProjectDomain(dominio),
    getDnsConfig(dominio),
    probeHttps(dominio),
  ])

  const config = cfg.data || null
  const registrato = !!progetto.data?.name
  const verified = progetto.data?.verified === true
  const apexName = progetto.data?.apexName || apexDiRipiego(dominio)
  const dnsAttuale = {
    a: config?.aValues || [],
    cname: (config?.cnames || []).map(c => String(c).replace(/\.$/, '')),
    configurato_come: config?.configuredBy || null,
    nameservers: config?.nameservers || [],
  }
  const atteso = recordDns(dominio, { apexName, config })
  const dnsPuntaAltrove = config?.misconfigured === true || (!dnsAttuale.a.length && !dnsAttuale.cname.length)

  let stato, fase, messaggio
  if (prova.raggiungibile) {
    stato = 'attivo'; fase = 'attivo'
    messaggio = 'Il dominio è online e mostra il tuo sito.'
  } else if (!registrato) {
    stato = 'pending'; fase = 'dns_mancante'
    messaggio = 'Stiamo collegando il dominio ai nostri server.'
  } else if (!verified) {
    stato = 'pending'; fase = 'proprieta'
    messaggio = 'Manca la conferma di proprietà: aggiungi anche il record TXT di verifica.'
  } else if (dnsPuntaAltrove) {
    stato = 'pending'
    fase = dnsAttuale.a.length || dnsAttuale.cname.length ? 'dns_errato' : 'dns_mancante'
    messaggio = fase === 'dns_errato'
      ? 'Il dominio esiste ma punta ancora al vecchio hosting: correggi i record qui sotto.'
      : 'Aggiungi i record DNS qui sotto nel pannello del tuo provider.'
  } else if (prova.causa === 'certificato' || prova.causa === 'rete') {
    stato = 'pending'; fase = 'certificato'
    messaggio = 'DNS corretti. Stiamo emettendo il certificato di sicurezza: di norma ci vogliono pochi minuti.'
  } else if (prova.causa === 'dns') {
    stato = 'pending'; fase = 'dns_mancante'
    messaggio = 'Il dominio non risponde ancora: i DNS possono richiedere qualche minuto per propagarsi.'
  } else {
    stato = 'pending'; fase = 'certificato'
    messaggio = 'Configurazione in corso, riprova tra qualche minuto.'
  }

  return {
    stato,
    fase,
    messaggio,
    registrato_su_vercel: registrato,
    verificato: verified,
    apex_name: apexName,
    dns_attuale: dnsAttuale,
    provider: riconosciProvider(dnsAttuale.nameservers),
    prova_https: prova,
    records: atteso,
    verifica_txt: recordVerifica(dominio, progetto.data?.verification),
    controllato_il: new Date().toISOString(),
  }
}
