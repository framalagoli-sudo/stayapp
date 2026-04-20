import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// POST /api/requests — guest submits a request (no auth)
router.post('/', async (req, res) => {
  const { property_id, room, type, message } = req.body
  if (!property_id || !type || !message) {
    return res.status(400).json({ error: 'property_id, type e message sono obbligatori' })
  }

  const { data, error } = await supabase
    .from('requests')
    .insert({ property_id, room: room || null, type, message, status: 'open' })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

// GET /api/requests — staff/admin views requests for their property
router.get('/', requireAuth, async (req, res) => {
  const { property_id, status } = req.query

  let query = supabase
    .from('requests')
    .select('*, properties(name)')
    .order('created_at', { ascending: false })

  if (property_id) query = query.eq('property_id', property_id)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// PATCH /api/requests/:id — update status
router.patch('/:id', requireAuth, async (req, res) => {
  const { status, note } = req.body

  const { data, error } = await supabase
    .from('requests')
    .update({ status, note, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

export default router
