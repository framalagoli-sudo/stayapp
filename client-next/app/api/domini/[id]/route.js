import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, getProfile } from '@/lib/server-auth'
import { ricontrolla } from '@/lib/domini-manutenzione'
import { addProjectDomain, removeProjectDomain, vercelReady } from '@/lib/vercel-domains'

const STAYAPP_DOMAIN = process.env.STAYAPP_DOMAIN?.trim() || 'oltrenova.com'

// Carica il dominio verificando che appartenga all'azienda di chi lo chiede.
async function caricaDominio(request, id) {
  const { user, response } = await requireAuth(request)
  if (response) return { response }
  const profile = await getProfile(user.id)
  if (!profile) return { response: Response.json({ error: 'Profilo non trovato' }, { status: 403 }) }

  let q = supabaseAdmin.from('domini').select('*').eq('id', id)
  if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
  const { data: dom } = await q.maybeSingle()
  if (!dom) return { response: Response.json({ error: 'Dominio non trovato' }, { status: 404 }) }
  return { dom, profile }
}

// Cambia l'indirizzo sul dominio della piattaforma (es. pizzeria.oltrenova.com).
// Non tocca lo slug dell'entità: il collegamento fra dominio e pagina passa da
// entity_id, quindi i due nomi possono essere diversi senza rompere niente.
export async function PATCH(request, { params }) {
  try {
    const { dom, response } = await caricaDominio(request, params.id)
    if (response) return response
    if (dom.tipo !== 'subdomain') {
      return Response.json({ error: 'Solo l’indirizzo incluso può essere rinominato qui' }, { status: 400 })
    }

    const body = await request.json()
    const raw = String(body.slug || '').trim().toLowerCase().slice(0, 63) // cap = label DNS, anche anti-ReDoS
    const nome = raw.replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '')
    if (!nome) return Response.json({ error: 'Indirizzo non valido: usa solo lettere, numeri e trattini' }, { status: 400 })

    const nuovoDominio = `${nome}.${STAYAPP_DOMAIN}`
    if (nuovoDominio === dom.dominio) return Response.json(dom)

    const { data: occupato } = await supabaseAdmin.from('domini').select('id').eq('dominio', nuovoDominio).neq('id', dom.id).maybeSingle()
    if (occupato) return Response.json({ error: 'Questo indirizzo è già usato da un’altra scheda' }, { status: 409 })

    if (vercelReady()) {
      const r = await addProjectDomain(nuovoDominio)
      if (!r.ok) return Response.json({ error: `Non siamo riusciti ad attivare il nuovo indirizzo: ${r.error}` }, { status: 400 })
    }

    const { data: aggiornato, error } = await supabaseAdmin.from('domini')
      .update({ dominio: nuovoDominio, vercel_domain_id: vercelReady() ? nuovoDominio : null, updated_at: new Date().toISOString() })
      .eq('id', dom.id).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Il vecchio indirizzo smette di esistere: liberiamolo su Vercel per non
    // lasciare hostname appesi (e certificati che si rinnovano a vuoto).
    if (vercelReady() && dom.vercel_domain_id) await removeProjectDomain(dom.dominio)

    return Response.json(await ricontrolla(aggiornato) || aggiornato)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request, { params }) {
  try {
    const { dom, response } = await caricaDominio(request, params.id)
    if (response) return response
    if (dom.tipo === 'subdomain') {
      return Response.json({ error: 'L’indirizzo incluso non può essere rimosso' }, { status: 400 })
    }

    if (vercelReady()) {
      await removeProjectDomain(dom.dominio)
      // Anche il gemello apex/www registrato insieme al dominio.
      if (dom.variante_dominio) await removeProjectDomain(dom.variante_dominio)
    }

    const { error } = await supabaseAdmin.from('domini').delete().eq('id', dom.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
