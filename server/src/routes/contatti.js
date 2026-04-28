import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

async function getAziendaId(userId) {
  const { data } = await supabase.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

// POST /api/contatti/subscribe — iscrizione pubblica da minisito/PWA
router.post('/subscribe', async (req, res) => {
  const { azienda_id, nome, email, telefono, fonte = 'minisito' } = req.body
  if (!azienda_id || !nome?.trim()) return res.status(400).json({ error: 'azienda_id e nome obbligatori' })
  if (!email?.trim() && !telefono?.trim()) return res.status(400).json({ error: 'Email o telefono obbligatori' })

  // Evita duplicati per email
  if (email) {
    const { data: existing } = await supabase.from('contatti')
      .select('id').eq('azienda_id', azienda_id).eq('email', email.trim()).single()
    if (existing) return res.json({ ok: true, duplicate: true })
  }

  const { data, error } = await supabase.from('contatti').insert({
    azienda_id, nome: nome.trim(),
    email: email?.trim() || null,
    telefono: telefono?.trim() || null,
    fonte, iscritto_newsletter: true,
    tags: ['newsletter'],
  }).select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

// GET /api/contatti — lista (auth)
router.get('/', requireAuth, async (req, res) => {
  const profile = await getAziendaId(req.user.id)
  if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })

  let q = supabase.from('contatti').select('*').order('created_at', { ascending: false })

  if (profile.role !== 'super_admin') {
    if (!profile.azienda_id) return res.json([])
    q = q.eq('azienda_id', profile.azienda_id)
  } else if (req.query.azienda_id) {
    q = q.eq('azienda_id', req.query.azienda_id)
  }

  if (req.query.tag) q = q.contains('tags', [req.query.tag])
  if (req.query.newsletter === 'true') q = q.eq('iscritto_newsletter', true)
  if (req.query.search) {
    const s = req.query.search
    q = q.or(`nome.ilike.%${s}%,email.ilike.%${s}%,telefono.ilike.%${s}%`)
  }

  const { data, error } = await q
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

// POST /api/contatti — crea manuale (auth)
router.post('/', requireAuth, async (req, res) => {
  const profile = await getAziendaId(req.user.id)
  const { nome, email, telefono, tags, note, iscritto_newsletter } = req.body
  const azienda_id = req.body.azienda_id || profile?.azienda_id
  if (!azienda_id || !nome?.trim()) return res.status(400).json({ error: 'azienda_id e nome obbligatori' })

  const { data, error } = await supabase.from('contatti').insert({
    azienda_id, nome: nome.trim(),
    email: email?.trim() || null,
    telefono: telefono?.trim() || null,
    tags: tags || [],
    note: note || null,
    iscritto_newsletter: !!iscritto_newsletter,
    fonte: 'manuale',
  }).select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

// PATCH /api/contatti/:id — aggiorna (auth)
router.patch('/:id', requireAuth, async (req, res) => {
  const allowed = ['nome', 'email', 'telefono', 'tags', 'note', 'iscritto_newsletter']
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase.from('contatti').update(updates).eq('id', req.params.id).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// DELETE /api/contatti/:id — elimina (auth)
router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabase.from('contatti').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

export default router
