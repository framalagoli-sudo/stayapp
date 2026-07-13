import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

const STAYAPP_DOMAIN   = process.env.STAYAPP_DOMAIN?.trim() || 'oltrenova.com'
const VERCEL_TOKEN      = process.env.VERCEL_TOKEN
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID

async function getProfile(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

export async function PATCH(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    let q = supabaseAdmin.from('domini').select('*').eq('id', params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
    const { data: dom } = await q.single()
    if (!dom) return Response.json({ error: 'Dominio non trovato' }, { status: 404 })
    if (dom.tipo !== 'subdomain') return Response.json({ error: 'Solo i sottodomini possono essere rinominati qui' }, { status: 400 })

    const body = await request.json()
    const raw = String(body.slug || '').trim().toLowerCase().slice(0, 63) // cap = label DNS, anche anti-ReDoS
    const cleanSlug = raw.replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '')
    if (!cleanSlug) return Response.json({ error: 'URL non valido: usa solo lettere, numeri e trattini' }, { status: 400 })

    const newDominio = `${cleanSlug}.${STAYAPP_DOMAIN}`
    const { data: existing } = await supabaseAdmin.from('domini').select('id').eq('dominio', newDominio).neq('id', dom.id).maybeSingle()
    if (existing) return Response.json({ error: 'Questo sottodominio è già in uso' }, { status: 409 })

    const { data: updated, error } = await supabaseAdmin.from('domini')
      .update({ dominio: newDominio, entity_slug: cleanSlug, updated_at: new Date().toISOString() })
      .eq('id', dom.id).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(updated)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    let q = supabaseAdmin.from('domini').select('*').eq('id', params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
    const { data: dom } = await q.single()
    if (!dom) return Response.json({ error: 'Dominio non trovato' }, { status: 404 })
    if (dom.tipo === 'subdomain') return Response.json({ error: 'Il sottodominio predefinito non può essere rimosso' }, { status: 400 })

    if (VERCEL_TOKEN && VERCEL_PROJECT_ID && dom.vercel_domain_id) {
      try {
        await fetch(`https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${encodeURIComponent(dom.dominio)}`, {
          method: 'DELETE', headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` },
        })
      } catch (e) { console.error('[domini] Vercel delete error:', e.message) }
    }

    const { error } = await supabaseAdmin.from('domini').delete().eq('id', dom.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
