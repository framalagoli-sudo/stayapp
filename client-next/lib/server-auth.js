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
