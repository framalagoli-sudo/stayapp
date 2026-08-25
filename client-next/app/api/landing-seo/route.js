import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

export async function GET() {
  try {
    // Colonne elencate, non `select('*')`: questa route risponde senza login, e
    // con l'asterisco ogni colonna aggiunta domani a `landing_seo` verrebbe
    // pubblicata da sola. Stessa regola del catalogo shop (23/08) e dei campi
    // entità (25/08). Una colonna nuova qui va aggiunta a mano, di proposito.
    const { data, error } = await supabaseAdmin.from('landing_seo')
      .select('id, meta, llms_txt, jsonld, ai_bots_allowed, updated_at').single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data || {})
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function PATCH(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') return Response.json({ error: 'Accesso negato' }, { status: 403 })

    const body = await request.json()
    const { data: existing } = await supabaseAdmin.from('landing_seo').select('id').single()
    const payload = { ...body, updated_at: new Date().toISOString() }

    let result
    if (existing) {
      const { data, error } = await supabaseAdmin.from('landing_seo').update(payload).eq('id', existing.id).select().single()
      if (error) return Response.json({ error: error.message }, { status: 500 })
      result = data
    } else {
      const { data, error } = await supabaseAdmin.from('landing_seo').insert(payload).select().single()
      if (error) return Response.json({ error: error.message }, { status: 500 })
      result = data
    }
    return Response.json(result)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
