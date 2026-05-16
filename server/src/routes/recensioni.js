import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

async function getProfile(userId) {
  const { data } = await supabase.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

// GET /api/recensioni?entity_tipo=&entity_id=
router.get('/', requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })

    let q = supabase.from('recensioni').select('*').order('created_at', { ascending: false })

    if (profile.role !== 'super_admin') {
      if (!profile.azienda_id) return res.json([])
      q = q.eq('azienda_id', profile.azienda_id)
    }
    if (req.query.entity_tipo) q = q.eq('entity_tipo', req.query.entity_tipo)
    if (req.query.entity_id)   q = q.eq('entity_id', req.query.entity_id)

    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/recensioni — crea manuale (admin) o genera token link
router.post('/', requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Accesso negato' })

    const { entity_tipo, entity_id, autore, stelle, testo, fonte = 'manuale' } = req.body
    if (!entity_tipo || !entity_id) return res.status(400).json({ error: 'entity_tipo e entity_id obbligatori' })

    // Se stelle non fornite → genera solo il link (token blank)
    if (!stelle) {
      const { data, error } = await supabase.from('recensioni').insert({
        azienda_id: profile.azienda_id,
        entity_tipo, entity_id,
        autore: autore?.trim() || '',
        stelle: 5,
        testo: '',
        fonte: 'form',
        verificata: false,
        pubblica: false,
      }).select().single()
      if (error) return res.status(500).json({ error: error.message })
      const link = `${process.env.CLIENT_URL || 'http://localhost:5173'}/recensione?token=${data.token}`
      return res.status(201).json({ ...data, link })
    }

    if (stelle < 1 || stelle > 5) return res.status(400).json({ error: 'stelle deve essere tra 1 e 5' })
    if (!autore?.trim()) return res.status(400).json({ error: 'autore obbligatorio' })

    const { data, error } = await supabase.from('recensioni').insert({
      azienda_id: profile.azienda_id,
      entity_tipo, entity_id,
      autore: autore.trim(),
      stelle: Number(stelle),
      testo: testo?.trim() || '',
      fonte,
      verificata: false,
      pubblica: true,
    }).select().single()

    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// PATCH /api/recensioni/:id
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Accesso negato' })

    const allowed = ['pubblica', 'risposta', 'stelle', 'autore', 'testo', 'fonte']
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))
    updates.updated_at = new Date().toISOString()

    let q = supabase.from('recensioni').update(updates).eq('id', req.params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)

    const { data, error } = await q.select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// DELETE /api/recensioni/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Accesso negato' })

    let q = supabase.from('recensioni').delete().eq('id', req.params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)

    const { error } = await q
    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/recensioni/genera-link — genera link vuoto (senza stelle) per un cliente
router.post('/genera-link', requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Accesso negato' })

    const { entity_tipo, entity_id, autore } = req.body
    if (!entity_tipo || !entity_id) return res.status(400).json({ error: 'entity_tipo e entity_id obbligatori' })

    const { data, error } = await supabase.from('recensioni').insert({
      azienda_id: profile.azienda_id,
      entity_tipo, entity_id,
      autore: autore?.trim() || '',
      stelle: 5,
      testo: '',
      fonte: 'form',
      verificata: false,
      pubblica: false,
    }).select().single()

    if (error) return res.status(500).json({ error: error.message })
    const link = `${process.env.CLIENT_URL || 'http://localhost:5173'}/recensione?token=${data.token}`
    res.status(201).json({ token: data.token, link })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
