import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

const VERCEL_TOKEN      = process.env.VERCEL_TOKEN
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID

function buildDnsInstructions(dominio) {
  const isApex = !dominio.startsWith('www.') && dominio.split('.').length === 2
  if (isApex) {
    return { type: 'apex', records: [
      { tipo: 'A', nome: '@', valore: '76.76.19.19', ttl: 'Auto' },
      { tipo: 'CNAME', nome: 'www', valore: 'cname.vercel-dns.com', ttl: 'Auto' },
    ]}
  }
  return { type: 'subdomain', records: [
    { tipo: 'CNAME', nome: dominio.split('.').slice(0, -2).join('.') || 'www', valore: 'cname.vercel-dns.com', ttl: 'Auto' },
  ]}
}

function buildDnsFromVercel(dominio, vData) {
  const base = buildDnsInstructions(dominio)
  if (vData?.verification?.length) {
    base.verifica_txt = vData.verification.map(v => ({ tipo: v.type || 'TXT', nome: v.domain || `_vercel.${dominio}`, valore: v.value || '' }))
  }
  return base
}

export async function POST(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    let q = supabaseAdmin.from('domini').select('*').eq('id', params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
    const { data: dom } = await q.single()
    if (!dom) return Response.json({ error: 'Dominio non trovato' }, { status: 404 })

    if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID)
      return Response.json({ ...dom, message: 'Verifica manuale: controlla che i DNS siano configurati correttamente' })

    if (!dom.vercel_domain_id) {
      try {
        const addRes = await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: dom.dominio }),
        })
        const addData = await addRes.json()
        if (!addData.error) {
          await supabaseAdmin.from('domini').update({ vercel_domain_id: dom.dominio, dns_istruzioni: buildDnsFromVercel(dom.dominio, addData) }).eq('id', dom.id)
          if (addData.verified) {
            const { data: updated } = await supabaseAdmin.from('domini').update({ stato: 'attivo' }).eq('id', dom.id).select().single()
            return Response.json(updated)
          }
        }
      } catch (e) { console.error('[domini] re-register error:', e.message) }
    }

    const vRes = await fetch(
      `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${encodeURIComponent(dom.dominio)}/verify`,
      { method: 'POST', headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` } }
    )
    const vData = await vRes.json()

    let stato
    if (vData.verified) stato = 'attivo'
    else if (vRes.ok || vData.error?.code === 'domain_already_in_use') stato = 'pending'
    else stato = 'errore'

    const { data: updated } = await supabaseAdmin.from('domini')
      .update({ stato, dns_istruzioni: buildDnsFromVercel(dom.dominio, vData) })
      .eq('id', dom.id).select().single()
    return Response.json(updated)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
