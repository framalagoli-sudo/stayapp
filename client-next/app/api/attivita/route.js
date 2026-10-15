import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { allaFormaStorica } from '@/lib/entita'
import { creaEntita } from '@/lib/crea-entita'
import { categoriaEsiste } from '@/lib/applica-profilo'

async function getProfile(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    let q = supabaseAdmin.from('entita').select('*').eq('tipo', 'attivita').order('name')
    if (profile.role !== 'super_admin') {
      if (!profile.azienda_id) return Response.json([])
      q = q.eq('azienda_id', profile.azienda_id)
    } else if (searchParams.get('azienda_id')) {
      q = q.eq('azienda_id', searchParams.get('azienda_id'))
    }
    const { data, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })
    // Il pannello conosce i nomi storici — per le attività `tipo` è la
    // descrizione del settore, non il tipo tecnico.
    return Response.json((data || []).map(allaFormaStorica))
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile || !['super_admin', 'admin_azienda'].includes(profile.role))
      return Response.json({ error: 'Permessi insufficienti' }, { status: 403 })

    const body = await request.json()
    const { name } = body
    if (!name?.trim()) return Response.json({ error: 'Il nome è obbligatorio' }, { status: 400 })
    const azienda_id = profile.role === 'super_admin' ? body.azienda_id : profile.azienda_id
    if (!azienda_id) return Response.json({ error: 'azienda_id obbligatorio' }, { status: 400 })
    // La categoria la sceglie solo il super_admin: le funzioni le decidiamo noi
    // (STRATEGIA.md §6.1). Si controlla PRIMA di creare, non dopo.
    const profilo = body.profilo ?? null
    if (profilo !== null) {
      if (profile.role !== 'super_admin') return Response.json({ error: 'La categoria la assegna OltreNova' }, { status: 403 })
      if (!(await categoriaEsiste(profilo))) return Response.json({ error: 'Categoria non valida' }, { status: 400 })
    }

    const allowed = ['description', 'address', 'phone', 'email', 'schedule']
    const extras = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))
    // Nel pannello il campo si chiama ancora `tipo`, ma è la descrizione del
    // settore ("Officina meccanica"): va in `settore`, perché `tipo` adesso
    // decide l'indirizzo pubblico.
    const settore = typeof body.tipo === 'string' && !['attivita', 'attività'].includes(body.tipo)
      ? body.tipo.trim() || null : null

    // Slug, preset, sottodominio e categoria: lib/crea-entita.js, uguale per i tre tipi.
    const nata = await creaEntita({ aziendaId: azienda_id, tipo: 'attivita', nome: name, extras, settore, profilo })
    return Response.json(allaFormaStorica(nata), { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
