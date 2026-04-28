import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'
import { emailTemplate } from './guest.js'

const router = Router()

async function sendAdminEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY || !to) return
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: process.env.RESEND_FROM || 'StayApp <noreply@stayapp.it>',
      to, subject, html,
    })
  } catch (err) {
    console.error('[email]', err.message)
  }
}

const STATUS_LABELS = {
  open: 'Aperta',
  in_progress: 'In gestione',
  resolved: 'Risolta',
  cancelled: 'Annullata',
}

// GET /api/requests/public?ids=id1,id2 — stato richieste ospite (no auth)
router.get('/public', async (req, res) => {
  const ids = (req.query.ids || '').split(',').filter(Boolean).slice(0, 20)
  if (!ids.length) return res.json([])
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const validIds = ids.filter(id => UUID_RE.test(id))
  if (!validIds.length) return res.json([])
  const { data, error } = await supabase
    .from('requests')
    .select('id, type, room, status, created_at')
    .in('id', validIds)
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

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

  // Email notification (fire-and-forget)
  supabase.from('properties').select('name, email').eq('id', property_id).single()
    .then(({ data: prop }) => {
      if (!prop?.email) return
      sendAdminEmail({
        to: prop.email,
        subject: `[${prop.name}] Nuova richiesta: ${type}`,
        html: emailTemplate({
          title: 'Nuova richiesta ospite',
          entityName: prop.name,
          rows: [
            { label: 'Tipo', value: type },
            ...(room ? [{ label: 'Camera', value: room }] : []),
            { label: 'Messaggio', value: message.replace(/\n/g, '<br>') },
          ],
          appUrl: process.env.APP_URL || 'https://stayapp.it',
        }),
      })
    })
    .catch(() => {})

  res.status(201).json(data)
})

// GET /api/requests — filtered by role
router.get('/', requireAuth, async (req, res) => {
  const { property_id, status } = req.query

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, azienda_id, property_id')
    .eq('id', req.user.id)
    .single()

  if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })

  let query = supabase
    .from('requests')
    .select('*, properties(name)')
    .order('created_at', { ascending: false })

  if (['admin_struttura', 'staff'].includes(profile.role)) {
    if (!profile.property_id) return res.json([])
    query = query.eq('property_id', profile.property_id)
  } else if (profile.role === 'admin_azienda') {
    if (!profile.azienda_id) return res.json([])
    const { data: props } = await supabase
      .from('properties')
      .select('id')
      .eq('azienda_id', profile.azienda_id)
    const ids = props?.map(p => p.id) || []
    if (ids.length === 0) return res.json([])
    query = query.in('property_id', ids)
  }

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
