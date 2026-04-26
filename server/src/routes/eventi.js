import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function getProfile(userId) {
  const { data } = await supabase
    .from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

const ALLOWED = ['title', 'description', 'cover_url', 'date_start', 'date_end',
  'location', 'price', 'seats_total', 'active', 'published', 'packages', 'entity_tipo', 'entity_id']

// GET /api/eventi — list (auth)
router.get('/', requireAuth, async (req, res) => {
  const profile = await getProfile(req.user.id)
  if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })

  let query = supabase.from('eventi').select('*').order('date_start')
  if (profile.role !== 'super_admin') {
    if (!profile.azienda_id) return res.json([])
    query = query.eq('azienda_id', profile.azienda_id)
  } else if (req.query.azienda_id) {
    query = query.eq('azienda_id', req.query.azienda_id)
  }

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// Bookings routes BEFORE /:id to avoid conflict
// GET /api/eventi/bookings/:bookingId/status — not needed
// PATCH /api/eventi/bookings/:bookingId
router.patch('/bookings/:bookingId', requireAuth, async (req, res) => {
  const { status, notes } = req.body
  const payload = { updated_at: new Date().toISOString() }
  if (status !== undefined) payload.status = status
  if (notes  !== undefined) payload.notes  = notes

  const { data, error } = await supabase
    .from('event_bookings').update(payload).eq('id', req.params.bookingId).select().single()
  if (error) return res.status(500).json({ error: error.message })

  // Ricalcola seats_booked sull'evento
  if (status) {
    const { data: confirmed } = await supabase
      .from('event_bookings').select('seats').eq('event_id', data.event_id).eq('status', 'confirmed')
    const total = (confirmed || []).reduce((s, b) => s + (b.seats || 1), 0)
    await supabase.from('eventi').update({ seats_booked: total, updated_at: new Date().toISOString() }).eq('id', data.event_id)
  }

  res.json(data)
})

// GET /api/eventi/:id
router.get('/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('eventi').select('*').eq('id', req.params.id).single()
  if (error || !data) return res.status(404).json({ error: 'Evento non trovato' })
  res.json(data)
})

// POST /api/eventi
router.post('/', requireAuth, async (req, res) => {
  const profile = await getProfile(req.user.id)
  if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })
  if (!['super_admin', 'admin_azienda'].includes(profile.role))
    return res.status(403).json({ error: 'Permessi insufficienti' })

  const { title, date_start } = req.body
  if (!title?.trim())  return res.status(400).json({ error: 'Il titolo è obbligatorio' })
  if (!date_start)     return res.status(400).json({ error: 'La data è obbligatoria' })

  const azienda_id = profile.role === 'super_admin' ? req.body.azienda_id : profile.azienda_id
  if (!azienda_id) return res.status(400).json({ error: 'azienda_id obbligatorio' })

  let base = slugify(title), slug = base, n = 0
  while (true) {
    const { data: ex } = await supabase.from('eventi').select('id').eq('slug', slug).maybeSingle()
    if (!ex) break
    slug = `${base}-${(++n).toString(36)}`
  }

  const payload = Object.fromEntries(Object.entries(req.body).filter(([k]) => ALLOWED.includes(k)))
  const { data, error } = await supabase.from('eventi').insert({ ...payload, azienda_id, slug }).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

// PATCH /api/eventi/:id
router.patch('/:id', requireAuth, async (req, res) => {
  const payload = Object.fromEntries(Object.entries(req.body).filter(([k]) => ALLOWED.includes(k)))
  payload.updated_at = new Date().toISOString()
  const { data, error } = await supabase.from('eventi').update(payload).eq('id', req.params.id).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// DELETE /api/eventi/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabase.from('eventi').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

// GET /api/eventi/:id/bookings
router.get('/:id/bookings', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('event_bookings').select('*').eq('event_id', req.params.id).order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

export default router
