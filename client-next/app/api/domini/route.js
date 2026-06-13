import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { createDefaultSubdomain } from '@/lib/create-subdomain'

const STAYAPP_DOMAIN   = process.env.STAYAPP_DOMAIN || 'oltrenova.com'
const VERCEL_TOKEN      = process.env.VERCEL_TOKEN
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID

async function getProfile(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

function buildDnsInstructions(dominio) {
  const isApex = !dominio.startsWith('www.') && dominio.split('.').length === 2
  if (isApex) {
    return { type: 'apex', records: [
      { tipo: 'A', nome: '@', valore: '76.76.19.19', ttl: 'Auto' },
      { tipo: 'CNAME', nome: 'www', valore: 'cname.vercel-dns.com', ttl: 'Auto' },
    ]}
  }
  const sub = dominio.split('.').slice(0, -2).join('.')
  return { type: 'subdomain', records: [
    { tipo: 'CNAME', nome: sub || 'www', valore: 'cname.vercel-dns.com', ttl: 'Auto' },
  ]}
}

function buildDnsFromVercel(dominio, vData) {
  const base = buildDnsInstructions(dominio)
  if (vData?.verification?.length) {
    base.verifica_txt = vData.verification.map(v => ({ tipo: v.type || 'TXT', nome: v.domain || `_vercel.${dominio}`, valore: v.value || '' }))
  }
  return base
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const entity_tipo = searchParams.get('entity_tipo')
    const entity_id   = searchParams.get('entity_id')

    let q = supabaseAdmin.from('domini').select('*').order('created_at', { ascending: true })
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
    if (entity_tipo) q = q.eq('entity_tipo', entity_tipo)
    if (entity_id)   q = q.eq('entity_id', entity_id)

    const { data, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })

    const list = data || []

    // Auto-crea sottodominio se mancante
    if (entity_tipo && entity_id && !list.some(d => d.tipo === 'subdomain')) {
      const table = entity_tipo === 'struttura' ? 'properties' : entity_tipo === 'ristorante' ? 'ristoranti' : 'attivita'
      const { data: entity } = await supabaseAdmin.from(table).select('azienda_id, slug').eq('id', entity_id).single()
      if (entity?.slug) {
        await createDefaultSubdomain({ azienda_id: entity.azienda_id, entity_tipo, entity_id, entity_slug: entity.slug })
        const { data: fresh } = await supabaseAdmin.from('domini').select('*')
          .eq('entity_tipo', entity_tipo).eq('entity_id', entity_id).order('created_at', { ascending: true })
        return Response.json(fresh || list)
      }
    }

    return Response.json(list)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const { entity_tipo, entity_id, dominio } = await request.json()
    if (!entity_tipo || !entity_id || !dominio?.trim())
      return Response.json({ error: 'entity_tipo, entity_id e dominio obbligatori' }, { status: 400 })

    const table = entity_tipo === 'struttura' ? 'properties' : entity_tipo === 'ristorante' ? 'ristoranti' : 'attivita'
    let entityQ = supabaseAdmin.from(table).select('azienda_id, slug').eq('id', entity_id)
    if (profile.role !== 'super_admin') entityQ = entityQ.eq('azienda_id', profile.azienda_id)
    const { data: entity } = await entityQ.single()
    if (!entity) return Response.json({ error: 'Entità non trovata' }, { status: 404 })

    const cleanDominio = dominio.trim().toLowerCase()
    let vercel_domain_id = null
    let dns_istruzioni = buildDnsInstructions(cleanDominio)
    let stato = 'pending'

    if (VERCEL_TOKEN && VERCEL_PROJECT_ID) {
      try {
        const vRes = await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: cleanDominio }),
        })
        const vData = await vRes.json()
        if (vData.error) return Response.json({ error: `Vercel: ${vData.error.message}` }, { status: 400 })
        vercel_domain_id = vData.name || cleanDominio
        dns_istruzioni = buildDnsFromVercel(cleanDominio, vData)
        stato = vData.verified ? 'attivo' : 'pending'
      } catch (e) { console.error('[domini] Vercel API error:', e.message) }
    }

    const { data, error } = await supabaseAdmin.from('domini').insert({
      azienda_id: entity.azienda_id, entity_tipo, entity_id, entity_slug: entity.slug,
      dominio: cleanDominio, tipo: 'custom', stato, vercel_domain_id, dns_istruzioni,
    }).select().single()
    if (error) {
      if (error.code === '23505') return Response.json({ error: 'Questo dominio è già registrato' }, { status: 409 })
      return Response.json({ error: error.message }, { status: 500 })
    }
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
