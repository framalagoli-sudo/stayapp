import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

const STAYAPP_DOMAIN = process.env.STAYAPP_DOMAIN || 'stayapp.it'
const VERCEL_TOKEN      = process.env.VERCEL_TOKEN
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID

async function getProfile(userId) {
  const { data } = await supabase.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

// GET /api/domini?entity_tipo=&entity_id=
router.get('/', async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })

    let q = supabase.from('domini').select('*').order('created_at', { ascending: true })
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
    if (req.query.entity_tipo) q = q.eq('entity_tipo', req.query.entity_tipo)
    if (req.query.entity_id)   q = q.eq('entity_id',   req.query.entity_id)

    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/domini — aggiunge dominio custom (chiama Vercel API)
router.post('/', async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })

    const { entity_tipo, entity_id, dominio } = req.body
    if (!entity_tipo || !entity_id || !dominio?.trim())
      return res.status(400).json({ error: 'entity_tipo, entity_id e dominio obbligatori' })

    // Verifica che l'entità appartenga all'azienda dell'utente
    const table = entity_tipo === 'struttura' ? 'properties' : entity_tipo === 'ristorante' ? 'ristoranti' : 'attivita'
    let entityQ = supabase.from(table).select('azienda_id, slug').eq('id', entity_id)
    if (profile.role !== 'super_admin') entityQ = entityQ.eq('azienda_id', profile.azienda_id)
    const { data: entity } = await entityQ.single()
    if (!entity) return res.status(404).json({ error: 'Entità non trovata' })

    const cleanDominio = dominio.trim().toLowerCase()

    // Chiama Vercel API se configurata
    let vercel_domain_id = null
    let dns_istruzioni = buildDnsInstructions(cleanDominio)
    let stato = 'pending'

    if (VERCEL_TOKEN && VERCEL_PROJECT_ID) {
      try {
        const vRes = await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${VERCEL_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: cleanDominio }),
        })
        const vData = await vRes.json()
        if (vData.error) {
          return res.status(400).json({ error: `Vercel: ${vData.error.message}` })
        }
        vercel_domain_id = vData.name || cleanDominio
        // Build istruzioni da risposta Vercel
        dns_istruzioni = buildDnsFromVercel(cleanDominio, vData)
        stato = vData.verified ? 'attivo' : 'pending'
      } catch (e) {
        console.error('[domini] Vercel API error:', e.message)
        // Continua senza Vercel — mostra istruzioni manuali
      }
    }

    const { data, error } = await supabase.from('domini').insert({
      azienda_id: entity.azienda_id,
      entity_tipo,
      entity_id,
      entity_slug: entity.slug,
      dominio: cleanDominio,
      tipo: 'custom',
      stato,
      vercel_domain_id,
      dns_istruzioni,
    }).select().single()

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Questo dominio è già registrato' })
      return res.status(500).json({ error: error.message })
    }
    res.status(201).json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/domini/:id/verify — controlla stato verifica su Vercel
router.post('/:id/verify', async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })

    let q = supabase.from('domini').select('*').eq('id', req.params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
    const { data: dom } = await q.single()
    if (!dom) return res.status(404).json({ error: 'Dominio non trovato' })

    if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
      return res.json({ ...dom, message: 'Verifica manuale: controlla che i DNS siano configurati correttamente' })
    }

    const vRes = await fetch(
      `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${encodeURIComponent(dom.dominio)}`,
      { headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` } }
    )
    const vData = await vRes.json()
    const stato = vData.verified ? 'attivo' : 'pending'

    const { data: updated } = await supabase.from('domini')
      .update({ stato, dns_istruzioni: buildDnsFromVercel(dom.dominio, vData) })
      .eq('id', dom.id).select().single()

    res.json(updated)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// DELETE /api/domini/:id
router.delete('/:id', async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })

    let q = supabase.from('domini').select('*').eq('id', req.params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
    const { data: dom } = await q.single()
    if (!dom) return res.status(404).json({ error: 'Dominio non trovato' })
    if (dom.tipo === 'subdomain') return res.status(400).json({ error: 'Il sottodominio predefinito non può essere rimosso' })

    // Rimuovi da Vercel se configurato
    if (VERCEL_TOKEN && VERCEL_PROJECT_ID && dom.vercel_domain_id) {
      try {
        await fetch(`https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${encodeURIComponent(dom.dominio)}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` },
        })
      } catch (e) { console.error('[domini] Vercel delete error:', e.message) }
    }

    const { error } = await supabase.from('domini').delete().eq('id', dom.id)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildDnsInstructions(dominio) {
  const isApex = !dominio.startsWith('www.') && dominio.split('.').length === 2
  if (isApex) {
    return {
      type: 'apex',
      records: [
        { tipo: 'A', nome: '@', valore: '76.76.19.19', ttl: 'Auto' },
        { tipo: 'CNAME', nome: 'www', valore: 'cname.vercel-dns.com', ttl: 'Auto' },
      ],
    }
  }
  const sub = dominio.split('.')[0]
  return {
    type: 'subdomain',
    records: [
      { tipo: 'CNAME', nome: sub === 'www' ? 'www' : dominio.split('.').slice(0, -2).join('.'), valore: 'cname.vercel-dns.com', ttl: 'Auto' },
    ],
  }
}

function buildDnsFromVercel(dominio, vData) {
  const base = buildDnsInstructions(dominio)
  if (vData?.verification?.length) {
    base.verifica_txt = vData.verification.map(v => ({
      tipo: v.type || 'TXT',
      nome: v.domain || `_vercel.${dominio}`,
      valore: v.value || '',
    }))
  }
  return base
}

// Usato da index.js per creare automaticamente il sottodominio alla creazione entità
export async function createDefaultSubdomain({ azienda_id, entity_tipo, entity_id, entity_slug }) {
  const stayappDomain = process.env.STAYAPP_DOMAIN || 'stayapp.it'
  const dominio = `${entity_slug}.${stayappDomain}`
  try {
    await supabase.from('domini').upsert({
      azienda_id, entity_tipo, entity_id, entity_slug,
      dominio, tipo: 'subdomain', stato: 'attivo',
    }, { onConflict: 'dominio', ignoreDuplicates: true })
  } catch (e) {
    console.error('[domini] createDefaultSubdomain error:', e.message)
  }
}

export default router
