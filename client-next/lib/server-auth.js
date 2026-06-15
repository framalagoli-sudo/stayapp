import { supabaseAdmin } from './supabase-server'

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
  const aal = decodeJwtPayload(token)?.aal
  if (aal === 'aal2') return null // già verificato 2FA → nessun costo

  const { data: profile } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', user.id).single()
  if (!profile?.azienda_id) return null // super_admin senza azienda o profilo orfano
  const { data: az } = await supabaseAdmin.from('aziende').select('require_2fa').eq('id', profile.azienda_id).single()
  if (!az?.require_2fa) return null

  return Response.json({ error: 'Verifica a due fattori richiesta', code: 'mfa_required' }, { status: 403 })
}

// Scorciatoia: restituisce Response 401 se non autorizzato, altrimenti l'utente.
// Applica anche l'enforcement 2FA (se l'azienda lo richiede).
// Uso: const { user, response } = await requireAuth(request)
//      if (response) return response
export async function requireAuth(request) {
  const user = await getAuthUser(request)
  if (!user) return { user: null, response: Response.json({ error: 'Non autorizzato' }, { status: 401 }) }
  const mfaResponse = await enforceMfa(request, user)
  if (mfaResponse) return { user: null, response: mfaResponse }
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
export const ENTITY_TABLES = { struttura: 'properties', ristorante: 'ristoranti', attivita: 'attivita' }

// Restituisce l'azienda_id proprietaria di una entità (struttura/ristorante/attivita), o null.
export async function getEntityAziendaId(entity_tipo, entity_id) {
  const table = ENTITY_TABLES[entity_tipo]
  if (!table || !entity_id) return null
  const { data } = await supabaseAdmin.from(table).select('azienda_id').eq('id', entity_id).single()
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
  const { data: prop } = await supabaseAdmin.from('properties').select('azienda_id').eq('id', property_id).single()
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
