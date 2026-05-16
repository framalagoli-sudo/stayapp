import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

async function getProfile(userId) {
  const { data } = await supabase.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

// GET /api/webhooks
router.get('/', requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })

    let q = supabase.from('webhooks').select('*').order('created_at', { ascending: false })
    if (profile.role !== 'super_admin') {
      if (!profile.azienda_id) return res.json([])
      q = q.eq('azienda_id', profile.azienda_id)
    } else if (req.query.azienda_id) {
      q = q.eq('azienda_id', req.query.azienda_id)
    }

    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/webhooks
router.post('/', requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Accesso negato' })

    const { nome, url, eventi } = req.body
    if (!url?.trim()) return res.status(400).json({ error: 'URL obbligatorio' })

    const { data, error } = await supabase.from('webhooks').insert({
      azienda_id: profile.azienda_id,
      nome: nome?.trim() || '',
      url: url.trim(),
      eventi: Array.isArray(eventi) ? eventi : [],
      attivo: true,
    }).select().single()

    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// PATCH /api/webhooks/:id
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Accesso negato' })

    const allowed = ['nome', 'url', 'eventi', 'attivo']
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))

    let q = supabase.from('webhooks').update(updates).eq('id', req.params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)

    const { data, error } = await q.select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// DELETE /api/webhooks/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Accesso negato' })

    let q = supabase.from('webhooks').delete().eq('id', req.params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)

    const { error } = await q
    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/webhooks/:id/test
router.post('/:id/test', requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Accesso negato' })

    let q = supabase.from('webhooks').select('*').eq('id', req.params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)

    const { data: hook, error } = await q.single()
    if (error || !hook) return res.status(404).json({ error: 'Webhook non trovato' })

    const body = JSON.stringify({
      evento: 'test',
      timestamp: new Date().toISOString(),
      messaggio: 'Payload di test da StayApp',
      azienda_id: profile.azienda_id,
    })

    try {
      const resp = await fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-StayApp-Event': 'test' },
        body,
        signal: AbortSignal.timeout(8000),
      })
      res.json({ ok: true, status: resp.status, statusText: resp.statusText })
    } catch (fetchErr) {
      res.status(400).json({ ok: false, error: fetchErr.message })
    }
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
