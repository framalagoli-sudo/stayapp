import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)

// GET /api/properties?azienda_id=xxx (azienda_id opzionale, solo per super_admin)
router.get('/', async (req, res) => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, property_id, azienda_id')
    .eq('id', req.user.id)
    .single()

  if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })

  let query = supabase.from('properties').select('*')

  if (profile.role === 'admin_struttura' || profile.role === 'staff') {
    query = query.eq('id', profile.property_id)
  } else if (profile.role === 'admin_azienda') {
    if (!profile.azienda_id) return res.json([])
    query = query.eq('azienda_id', profile.azienda_id)
  } else if (profile.role === 'super_admin' && req.query.azienda_id) {
    query = query.eq('azienda_id', req.query.azienda_id)
  }
  // super_admin senza filtro vede tutto

  const { data, error } = await query.order('name')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// GET /api/properties/:id
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (error || !data) return res.status(404).json({ error: 'Struttura non trovata' })
  res.json(data)
})

// POST /api/properties
router.post('/', async (req, res) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, group_id')
      .eq('id', req.user.id)
      .single()

    if (!profile || !['super_admin', 'admin_azienda'].includes(profile.role)) {
      return res.status(403).json({ error: 'Permessi insufficienti' })
    }

    const azienda_id = profile.role === 'super_admin'
      ? req.body.azienda_id
      : profile.azienda_id
    if (!azienda_id) return res.status(400).json({ error: 'azienda_id obbligatorio' })

    const { name } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Il nome è obbligatorio' })

    const baseSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'struttura'

    const { data: existing } = await supabase
      .from('properties')
      .select('id')
      .eq('slug', baseSlug)
      .limit(1)

    const slug = (existing && existing.length > 0)
      ? `${baseSlug}-${Date.now().toString(36)}`
      : baseSlug

    const allowed = ['description', 'address', 'phone', 'whatsapp', 'email', 'wifi_name', 'wifi_password', 'checkin_time', 'checkout_time', 'rules', 'amenities']
    const extras = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))

    const { data, error } = await supabase
      .from('properties')
      .insert({ name: name.trim(), slug, azienda_id, ...extras })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json(data)
  } catch (err) {
    console.error('POST /api/properties error:', err)
    res.status(500).json({ error: 'Errore interno del server' })
  }
})

// PATCH /api/properties/:id
router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['name', 'description', 'address', 'phone', 'whatsapp', 'email', 'wifi_name', 'wifi_password', 'checkin_time', 'checkout_time', 'rules', 'amenities', 'modules', 'theme', 'logo_url', 'cover_url', 'services', 'gallery', 'restaurant', 'activities', 'excursions', 'minisito']
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    )

    // Handle slug change separately with uniqueness validation
    if (req.body.slug !== undefined) {
      const clean = String(req.body.slug).toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      if (!clean) return res.status(400).json({ error: 'Slug non valido' })
      const { data: existing } = await supabase.from('properties')
        .select('id').eq('slug', clean).neq('id', req.params.id).maybeSingle()
      if (existing) return res.status(409).json({ error: 'Questo URL è già in uso da un\'altra struttura.' })
      updates.slug = clean
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nessun campo da aggiornare' })
    }

    const { data, error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    console.error('PATCH /api/properties/:id error:', err)
    res.status(500).json({ error: 'Errore interno del server' })
  }
})

// DELETE /api/properties/:id
router.delete('/:id', async (req, res) => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', req.user.id)
    .single()

  if (!profile || !['super_admin', 'admin_gruppo'].includes(profile.role)) {
    return res.status(403).json({ error: 'Permessi insufficienti' })
  }

  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', req.params.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

export default router
