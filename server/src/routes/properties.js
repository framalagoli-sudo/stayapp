import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)

// GET /api/properties
router.get('/', async (req, res) => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, property_id, group_id')
    .eq('id', req.user.id)
    .single()

  if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })

  let query = supabase.from('properties').select('*')

  if (profile.role === 'admin_struttura' || profile.role === 'staff') {
    query = query.eq('id', profile.property_id)
  } else if (profile.role === 'admin_gruppo') {
    query = query.eq('group_id', profile.group_id)
  }
  // super_admin vede tutto

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

    if (!profile || !['super_admin', 'admin_gruppo'].includes(profile.role)) {
      return res.status(403).json({ error: 'Permessi insufficienti' })
    }

    const { name } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Il nome è obbligatorio' })

    // Genera slug dal nome
    const baseSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'struttura'

    // Verifica unicità slug con .limit(1) invece di .maybeSingle()
    const { data: existing } = await supabase
      .from('properties')
      .select('id')
      .eq('slug', baseSlug)
      .limit(1)

    const slug = (existing && existing.length > 0)
      ? `${baseSlug}-${Date.now().toString(36)}`
      : baseSlug

    const allowed = ['description', 'address', 'phone', 'email', 'wifi_name', 'wifi_password', 'checkin_time', 'checkout_time', 'rules', 'amenities']
    const extras = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))

    const { data, error } = await supabase
      .from('properties')
      .insert({
        name: name.trim(),
        slug,
        ...extras,
        ...(profile.role === 'admin_gruppo' && { group_id: profile.group_id }),
      })
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
    const allowed = ['name', 'description', 'address', 'phone', 'email', 'wifi_name', 'wifi_password', 'checkin_time', 'checkout_time', 'rules', 'amenities', 'modules']
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    )

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
