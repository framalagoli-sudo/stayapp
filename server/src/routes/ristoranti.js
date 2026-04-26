import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

async function getProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('role, azienda_id')
    .eq('id', userId)
    .single()
  return data
}

// GET /api/ristoranti?azienda_id=xxx (azienda_id opzionale, solo per super_admin)
router.get('/', async (req, res) => {
  const profile = await getProfile(req.user.id)
  if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })

  let query = supabase.from('ristoranti').select('*').order('name')

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

// GET /api/ristoranti/:id
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('ristoranti').select('*').eq('id', req.params.id).single()
  if (error || !data) return res.status(404).json({ error: 'Ristorante non trovato' })
  res.json(data)
})

// POST /api/ristoranti
router.post('/', async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })

    if (!['super_admin', 'admin_azienda'].includes(profile.role)) {
      return res.status(403).json({ error: 'Permessi insufficienti' })
    }

    const { name } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Il nome è obbligatorio' })

    const azienda_id = profile.role === 'super_admin'
      ? req.body.azienda_id
      : profile.azienda_id
    if (!azienda_id) return res.status(400).json({ error: 'azienda_id obbligatorio' })

    // Genera slug
    const baseSlug = name
      .toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      || 'ristorante'
    const { data: existing } = await supabase
      .from('ristoranti').select('id').eq('slug', baseSlug).limit(1)
    const slug = existing?.length > 0
      ? `${baseSlug}-${Date.now().toString(36)}`
      : baseSlug

    const allowed = ['name', 'description', 'address', 'phone', 'email', 'schedule']
    const extras = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))

    const { data, error } = await supabase
      .from('ristoranti').insert({ azienda_id, slug, ...extras }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json(data)
  } catch (err) {
    console.error('POST /api/ristoranti error:', err)
    res.status(500).json({ error: 'Errore interno del server' })
  }
})

// PATCH /api/ristoranti/:id
router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['name', 'description', 'address', 'phone', 'email', 'schedule',
      'theme', 'logo_url', 'cover_url', 'gallery', 'menu', 'active', 'modules', 'minisito']
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))

    if (req.body.slug !== undefined) {
      const clean = String(req.body.slug).toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      if (!clean) return res.status(400).json({ error: 'Slug non valido' })
      const { data: existing } = await supabase.from('ristoranti')
        .select('id').eq('slug', clean).neq('id', req.params.id).maybeSingle()
      if (existing) return res.status(409).json({ error: 'Questo URL è già in uso da un\'altro ristorante.' })
      updates.slug = clean
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nessun campo da aggiornare' })
    }

    const { data, error } = await supabase
      .from('ristoranti')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select().single()

    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: 'Errore interno del server' })
  }
})

// DELETE /api/ristoranti/:id
router.delete('/:id', async (req, res) => {
  const profile = await getProfile(req.user.id)
  if (!profile || !['super_admin', 'admin_azienda'].includes(profile.role)) {
    return res.status(403).json({ error: 'Permessi insufficienti' })
  }

  const { error } = await supabase.from('ristoranti').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

export default router
