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

// Scorciatoia: restituisce Response 401 se non autorizzato, altrimenti l'utente
// Uso: const { user, response } = await requireAuth(request)
//      if (response) return response
export async function requireAuth(request) {
  const user = await getAuthUser(request)
  if (!user) return { user: null, response: Response.json({ error: 'Non autorizzato' }, { status: 401 }) }
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
