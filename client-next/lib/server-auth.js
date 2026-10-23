import { supabaseAdmin } from './supabase-server'
import { registraAudit } from './audit'

// Verifica il Bearer token e restituisce l'utente Supabase, o null se non autorizzato
export async function getAuthUser(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  return user
}

// Decodifica il payload di un JWT (senza verifica — la firma è già validata da getUser).
function decodeJwtPayload(token) {
  try {
    const part = token.split('.')[1]
    const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    return JSON.parse(json)
  } catch { return null }
}

// Path esenti dall'enforcement 2FA: servono al client per determinare lo stato
// (profilo, config) e per il flusso di login/setup, anche a sessione aal1.
const MFA_EXEMPT_PREFIXES = ['/api/auth/']

// Enforcement 2FA server-side: se l'azienda dell'utente ha require_2fa attivo e la
// sessione NON è aal2 (secondo fattore completato), blocca con 403 mfa_required.
// Ottimizzazione: gli utenti già aal2 escono subito senza query DB.
async function enforceMfa(request, user) {
  const pathname = new URL(request.url).pathname
  if (MFA_EXEMPT_PREFIXES.some(p => pathname.startsWith(p))) return null

  const token = request.headers.get('authorization')?.slice(7) || ''
  const claims = decodeJwtPayload(token)
  if (claims?.aal === 'aal2') return null // già verificato 2FA → nessun costo

  // Chi è entrato con una passkey ha già fatto di più, non di meno: la credenziale
  // è legata crittograficamente al dominio, quindi un sito civetta non può
  // rigiocarla e il phishing che intercetta password e codici non la tocca.
  // Supabase la classifica come primo fattore (aal1) ma registra il metodo in
  // `amr`: per noi vale come autenticazione completa, altrimenti chiederemmo un
  // codice più debole a chi ha già usato il mezzo più forte.
  if (claims?.amr?.some(m => m?.method === 'passkey' || m?.method === 'webauthn')) return null

  const { data: profile } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', user.id).single()
  if (!profile?.azienda_id) return null // super_admin senza azienda o profilo orfano
  const { data: az } = await supabaseAdmin.from('aziende').select('require_2fa').eq('id', profile.azienda_id).single()
  if (!az?.require_2fa) return null

  return Response.json({ error: 'Verifica a due fattori richiesta', code: 'mfa_required' }, { status: 403 })
}

// Verifica un permesso granulare. SOLO il ruolo 'staff' è ristretto dai permessi;
// admin_azienda/super_admin/altri ruoli admin hanno accesso pieno alla propria azienda.
export function hasPermission(profile, permKey) {
  if (!profile) return false
  if (profile.role !== 'staff') return true
  return !!profile.permissions?.[permKey]
}

// Cosa può fare un collaboratore ('staff'), percorso per percorso.
//
// Per ogni regola: `scrivere` (POST/PATCH/PUT/DELETE) e `leggere` (GET) sono
// l'elenco dei permessi di cui ne basta UNO; `TITOLARE` = mai a un
// collaboratore; assente = nessun limite oltre all'azienda. Vince la PRIMA
// regola che corrisponde, quindi le più specifiche stanno sopra.
//
// Prima del 23/10/2026 le letture erano libere e le scritture controllate solo
// su 15 prefissi: un collaboratore senza nessun permesso leggeva le
// prenotazioni con nomi ed email e cancellava pagine, vetrine, offerte,
// webhook (`tests/probe-permessi-collaboratori.mjs`). Il menu nascondeva le
// voci; la route rispondeva lo stesso.
//
// Le letture incrociate sono volute e scritte qui: l'editor del sito sceglie
// fra moduli e risorse, le Prenotazioni mostrano gli eventi, lo Studio
// contenuti legge il piano editoriale. Una pagina del pannello nuova che legge
// da un'altra sezione va aggiunta alla regola di quella sezione.
const TITOLARE = 'titolare'
const SITO = ['struttura', 'ristorante', 'attivita_gestione']
const ENTRAMBI = p => ({ scrivere: p, leggere: p })
const PERMESSI_STAFF = [
  [/^\/api\/contatti/,                          { scrivere: ['contatti'], leggere: ['contatti', 'preventivi'] }],
  [/^\/api\/newsletter/,                        ENTRAMBI(['newsletter'])],
  [/^\/api\/whatsapp\/connect/,                 { scrivere: TITOLARE }],
  [/^\/api\/whatsapp/,                          ENTRAMBI(['newsletter'])],
  [/^\/api\/blog/,                              ENTRAMBI(['blog'])],   // anche /api/blog-automazioni
  [/^\/api\/automazioni/,                       ENTRAMBI(['automazioni'])],
  [/^\/api\/piano-editoriale/,                  { scrivere: ['piano_editoriale'], leggere: ['piano_editoriale', 'content_studio'] }],
  [/^\/api\/content-studio/,                    ENTRAMBI(['content_studio'])],
  [/^\/api\/preventivi/,                        ENTRAMBI(['preventivi'])],
  [/^\/api\/form-builder\/[^/]+\/submissions/,  ENTRAMBI(['form_builder'])],
  [/^\/api\/form-builder/,                      { scrivere: ['form_builder'], leggere: ['form_builder', ...SITO] }],
  [/^\/api\/shop/,                              ENTRAMBI(['shop'])],
  [/^\/api\/loyalty/,                           ENTRAMBI(['loyalty'])],
  [/^\/api\/recensioni/,                        ENTRAMBI(['recensioni'])],
  [/^\/api\/survey/,                            ENTRAMBI(['survey'])],
  [/^\/api\/eventi/,                            { scrivere: ['eventi'], leggere: ['eventi', 'prenotazioni'] }],
  [/^\/api\/booking\/risorse/,                  { scrivere: ['booking'], leggere: ['booking', 'prenotazioni', ...SITO] }],
  [/^\/api\/booking/,                           { scrivere: ['booking'], leggere: ['booking', 'prenotazioni'] }],
  [/^\/api\/requests/,                          ENTRAMBI(['richieste'])],
  [/^\/api\/offerte/,                           { scrivere: ['eventi'], leggere: ['eventi', ...SITO] }],
  [/^\/api\/pagamenti/,                         ENTRAMBI(['eventi', 'booking', 'prenotazioni'])],
  [/^\/api\/analytics/,                         { leggere: ['analytics'] }],
  [/^\/api\/ai\/blog-auto/,                     { scrivere: ['blog'] }],
  [/^\/api\/ai\/social-post/,                   { scrivere: ['piano_editoriale', 'content_studio'] }],
  [/^\/api\/ai\/(from-document|generate-site)/, { scrivere: SITO }],
  [/^\/api\/stripe\/connect/,                   { scrivere: TITOLARE }],   // l'editor del sito legge se si incassa
  [/^\/api\/stripe/,                            ENTRAMBI(TITOLARE)],
  [/^\/api\/webhooks/,                          ENTRAMBI(TITOLARE)],
  [/^\/api\/google-calendar/,                   { scrivere: TITOLARE }],
  [/^\/api\/(properties|ristoranti|attivita)$/, { scrivere: TITOLARE }],   // creare un'entità
  [/^\/api\/upload\/event-cover/,               { scrivere: ['eventi'] }],
  [/^\/api\/upload\/blog-cover/,                { scrivere: ['blog'] }],
  [/^\/api\/upload\/risorsa-gallery/,           { scrivere: ['booking'] }],
  [/^\/api\/upload\/minisito-image/,            { scrivere: [...SITO, 'shop'] }],   // anche le foto dei prodotti
  // Le offerte scelgono un elemento di vetrina: chi ha gli eventi le legge.
  [/^\/api\/(vetrine|vetrina-elementi)(\/|$)/,  { scrivere: SITO, leggere: ['eventi', ...SITO] }],
  // Solo QUALI tipi di blocco usa il sito: lo chiede la pagina delle risorse
  // per avvisare «non si vede da nessuna parte».
  [/^\/api\/pagine\/blocchi-usati/,             { scrivere: SITO }],
  [/^\/api\/(pagine|sezioni|translations|sito-snapshots|collegamenti)(\/|$)/, ENTRAMBI(SITO)],
  [/^\/api\/(upload|site-templates|entita|domini|properties|ristoranti|attivita)\//, { scrivere: SITO }],
]
const MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])

// La regola di un percorso per un collaboratore: null = concesso.
function permessoStaffNegato(pathname, metodo, permessi = {}) {
  const regola = PERMESSI_STAFF.find(([re]) => re.test(pathname))?.[1]
  const servono = MUTATION_METHODS.has(metodo) ? regola?.scrivere : regola?.leggere
  if (!servono) return false
  if (servono === TITOLARE) return true
  return !servono.some(k => !!permessi?.[k])
}

// Enforcement permessi staff, per letture e scritture.
async function enforcePermission(request, user) {
  const pathname = new URL(request.url).pathname
  // Un percorso senza regola non costa una lettura del profilo.
  if (!PERMESSI_STAFF.some(([re]) => re.test(pathname))) return null
  const { data: profile } = await supabaseAdmin.from('profiles').select('role, permissions').eq('id', user.id).single()
  if (!profile || profile.role !== 'staff') return null // solo staff è ristretto
  if (!permessoStaffNegato(pathname, request.method, profile.permissions)) return null
  return Response.json({ error: 'Permesso negato per questa sezione', code: 'permission_denied' }, { status: 403 })
}

// Scorciatoia: restituisce Response 401 se non autorizzato, altrimenti l'utente.
// Applica anche l'enforcement 2FA e dei permessi staff.
// Uso: const { user, response } = await requireAuth(request)
//      if (response) return response
export async function requireAuth(request) {
  const user = await getAuthUser(request)
  if (!user) {
    // Anche i tentativi respinti vanno registrati: sono il segnale che serve
    // per accorgersi di qualcuno che bussa con credenziali che non ha.
    await registraAudit(request, { user: null, statusCode: 401 })
    return { user: null, response: Response.json({ error: 'Non autorizzato' }, { status: 401 }) }
  }
  const mfaResponse = await enforceMfa(request, user)
  if (mfaResponse) {
    await registraAudit(request, { user, statusCode: 403 })
    return { user: null, response: mfaResponse }
  }
  const permResponse = await enforcePermission(request, user)
  if (permResponse) {
    await registraAudit(request, { user, statusCode: 403 })
    return { user: null, response: permResponse }
  }
  // Richiesta ammessa. Lo status finale lo decide la route, quindi qui resta
  // nullo: il registro dice chi ha tentato cosa, che è ciò che serve a
  // ricostruire l'attività di una sessione.
  await registraAudit(request, { user })
  return { user, response: null }
}

// Solo per chi amministra la piattaforma. Chiunque altro riceve 404, non 403:
// una pagina che non ti riguarda non deve nemmeno dirti che esiste.
// Uso: const { response } = await requireSuperAdmin(request)
//      if (response) return response
export async function requireSuperAdmin(request) {
  const { user, response } = await requireAuth(request)
  if (response) return { user: null, response }
  const { data: profile, error } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
  // Se la lettura fallisce si risponde comunque 404 (nel dubbio, chiuso), ma lo
  // si scrive: altrimenti un guasto del database sembra un «non sei tu» e non
  // lascia traccia (successo una volta il 15/10 in una sonda, non riprodotto).
  if (error) console.error(`[auth] requireSuperAdmin: profilo non letto per ${user.id}: ${error.message}`)
  if (profile?.role !== 'super_admin') {
    return { user: null, response: Response.json({ error: 'Non trovato' }, { status: 404 }) }
  }
  return { user, response: null }
}

// Carica il profilo completo (role, azienda_id, ecc.)
export async function getProfile(userId) {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('role, azienda_id, property_id, group_id, permissions')
    .eq('id', userId)
    .single()
  return data
}

// Mappa entity_tipo → tabella. Unica fonte di verità.
export const ENTITY_TABLES = { struttura: 'entita', ristorante: 'entita', attivita: 'entita' }

// Restituisce l'azienda_id proprietaria di una entità (struttura/ristorante/attivita), o null.
// Legge dalla tabella unificata: è la domanda che ogni controllo di
// autorizzazione deve poter fare, e ora ha una risposta sola invece di tre.
// Il `tipo` resta nel filtro perché un id di tipo sbagliato non deve passare
// per buono solo perché esiste.
export async function getEntityAziendaId(entity_tipo, entity_id) {
  if (!ENTITY_TABLES[entity_tipo] || !entity_id) return null
  const { data } = await supabaseAdmin
    .from('entita').select('azienda_id').eq('id', entity_id).eq('tipo', entity_tipo).maybeSingle()
  return data?.azienda_id ?? null
}

// Determina su quale azienda_id un utente può SCRIVERE (insert).
// Solo super_admin può indicarne una diversa via body.azienda_id; tutti gli altri
// sono sempre vincolati alla propria azienda. Restituisce null se non determinabile.
// Uso: const azienda_id = resolveAziendaId(profile, body.azienda_id)
//      if (!azienda_id) return Response.json({ error: 'Azienda non valida' }, { status: 400 })
export function resolveAziendaId(profile, bodyAziendaId) {
  if (!profile) return null
  if (profile.role === 'super_admin') return bodyAziendaId || null
  return profile.azienda_id || null
}

// Verifica se un profilo può accedere a una property (struttura).
// super_admin: sempre; admin_struttura/staff: solo la propria; altri ruoli: stessa azienda.
// Usato per risorse legate a property_id (requests, messages, ...).
export async function userCanAccessProperty(profile, property_id) {
  if (!profile || !property_id) return false
  if (profile.role === 'super_admin') return true
  if (['admin_struttura', 'staff'].includes(profile.role)) return profile.property_id === property_id
  const { data: prop } = await supabaseAdmin.from('entita')
    .select('azienda_id').eq('id', property_id).eq('tipo', 'struttura').maybeSingle()
  return !!prop && prop.azienda_id === profile.azienda_id
}

// Autorizza l'accesso a un record che possiede una colonna azienda_id diretta
// (eventi, articoli, collegamenti, blog_categories, recensioni, ...).
// Carica il record, verifica la proprietà e risponde 404 se non autorizzato.
// Uso:
//   const { response } = await requireRecordAccess(request, 'eventi', params.id)
//   if (response) return response
export async function requireRecordAccess(request, table, id, aziendaColumn = 'azienda_id') {
  const { user, response } = await requireAuth(request)
  if (response) return { response }
  const profile = await getProfile(user.id)
  if (!profile) return { response: Response.json({ error: 'Profilo non trovato' }, { status: 403 }) }
  const { data: record } = await supabaseAdmin.from(table).select(aziendaColumn).eq('id', id).single()
  if (!record) return { response: Response.json({ error: 'Non trovato' }, { status: 404 }) }
  if (profile.role !== 'super_admin' && record[aziendaColumn] !== profile.azienda_id) {
    return { response: Response.json({ error: 'Non trovato' }, { status: 404 }) }
  }
  return { user, profile, aziendaId: record[aziendaColumn], response: null }
}

// ── Autorizzazione entità ─────────────────────────────────────────────────────
// Autentica l'utente E verifica che possa accedere all'entità indicata.
// super_admin passa sempre; gli altri solo se l'entità appartiene alla loro azienda.
// Uso:
//   const { profile, response } = await requireEntityAccess(request, entity_tipo, entity_id)
//   if (response) return response
// Risponde 404 (non 403) per non rivelare l'esistenza di risorse altrui.
export async function requireEntityAccess(request, entity_tipo, entity_id) {
  const { user, response } = await requireAuth(request)
  if (response) return { response }
  const profile = await getProfile(user.id)
  if (!profile) return { response: Response.json({ error: 'Profilo non trovato' }, { status: 403 }) }
  if (profile.role === 'super_admin') return { user, profile, response: null }
  const aziendaId = await getEntityAziendaId(entity_tipo, entity_id)
  if (!aziendaId || aziendaId !== profile.azienda_id) {
    return { response: Response.json({ error: 'Non trovato' }, { status: 404 }) }
  }
  return { user, profile, response: null }
}

// Un oggetto che appartiene a un'entità (pagina, sezione, vetrina, versione del
// sito…): prima il login, poi «esiste ed è tuo?» con UNA risposta sola.
// Cercarlo prima del login, o rispondere «Pagina non trovata» a un id inventato
// e «Non trovato» a quello di un altro, dice a chiunque cosa esiste — misurato
// su sei route il 16/10/2026 (`tests/probe-enumerazione.mjs`).
// Uso:
//   const { record, profile, response } = await requireEntityRecordAccess(request, 'pagine', params.id)
//   if (response) return response
// `colonne` deve contenere entity_tipo ed entity_id.
export async function requireEntityRecordAccess(request, table, id, colonne = 'id, entity_tipo, entity_id') {
  const { user, response } = await requireAuth(request)
  if (response) return { response }
  const profile = await getProfile(user.id)
  if (!profile) return { response: Response.json({ error: 'Profilo non trovato' }, { status: 403 }) }
  const nonTrovato = { response: Response.json({ error: 'Non trovato' }, { status: 404 }) }
  const { data: record } = await supabaseAdmin.from(table).select(colonne).eq('id', id).maybeSingle()
  if (!record) return nonTrovato
  if (profile.role !== 'super_admin') {
    const aziendaId = await getEntityAziendaId(record.entity_tipo, record.entity_id)
    if (!aziendaId || aziendaId !== profile.azienda_id) return nonTrovato
  }
  return { user, profile, record, response: null }
}

// L'entità indicata NEL CORPO della richiesta è davvero della propria azienda?
//
// Serve quando si crea o modifica un contenuto agganciato a un'entità (evento,
// risorsa, recensione, articolo, newsletter): l'`azienda_id` del record è già
// protetto da `resolveAziendaId`, ma `entity_id` arriva dal client e senza
// questo controllo si aggancia il proprio contenuto al **sito di un altro
// cliente** — dove compare al pubblico e ne raccoglie le prenotazioni.
// Verificato sfruttabile il 24/08/2026 su eventi e risorse booking.
//
// entity_id assente = contenuto aziendale (vale per tutte le proprie entità): ok.
// Uso:  if (!(await entitaDellaAzienda(profile, tipo, id)))
//         return Response.json({ error: 'Entità non valida' }, { status: 404 })
export async function entitaDellaAzienda(profile, entity_tipo, entity_id) {
  if (!entity_id) return true
  if (!profile) return false
  if (profile.role === 'super_admin') return true
  const aziendaId = await getEntityAziendaId(entity_tipo, entity_id)
  return !!aziendaId && aziendaId === profile.azienda_id
}
