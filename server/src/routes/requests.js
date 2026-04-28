import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

async function sendAdminEmail({ to, subject, html }) {
  console.log('[email] API key presente:', !!process.env.RESEND_API_KEY)
  console.log('[email] Destinatario:', to)
  console.log('[email] Mittente:', process.env.RESEND_FROM)
  if (!process.env.RESEND_API_KEY) { console.log('[email] SKIP: RESEND_API_KEY mancante'); return }
  if (!to) { console.log('[email] SKIP: email destinatario mancante'); return }
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM || 'StayApp <noreply@stayapp.it>',
      to, subject, html,
    })
    console.log('[email] Inviata OK:', result)
  } catch (err) {
    console.error('[email] ERRORE:', err.message, err)
  }
}

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
        html: `
          <h2>Nuova richiesta ospite</h2>
          <p><strong>Tipo:</strong> ${type}</p>
          ${room ? `<p><strong>Camera:</strong> ${room}</p>` : ''}
          <p><strong>Messaggio:</strong><br>${message.replace(/\n/g, '<br>')}</p>
          <hr>
          <p style="color:#888;font-size:12px">StayApp — pannello admin: ${process.env.APP_URL || 'https://stayapp.it'}/admin/requests</p>
        `,
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
  // super_admin, admin, editor: vedono tutto

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
