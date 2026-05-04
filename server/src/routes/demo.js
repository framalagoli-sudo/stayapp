import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'
import { emailTemplate } from './guest.js'

const router = Router()
const NOTIFY_EMAIL = process.env.DEMO_NOTIFY_EMAIL || 'fra.malagoli@gmail.com'

async function assertSuperAdmin(userId) {
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).single()
  return data?.role === 'super_admin'
}

// POST /api/demo — richiesta demo pubblica (no auth)
router.post('/', async (req, res) => {
  const { nome, email, telefono, tipo_attivita, messaggio } = req.body
  if (!nome?.trim() || !email?.trim())
    return res.status(400).json({ error: 'Nome e email sono obbligatori' })

  const { error } = await supabase.from('demo_requests').insert({
    nome: nome.trim(),
    email: email.trim(),
    telefono: telefono?.trim() || null,
    tipo_attivita: tipo_attivita?.trim() || null,
    messaggio: messaggio?.trim() || null,
  })
  if (error) return res.status(500).json({ error: error.message })

  // Notifica email al team StayApp
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: process.env.RESEND_FROM || 'StayApp <noreply@stayapp.it>',
        to: NOTIFY_EMAIL,
        replyTo: email.trim(),
        subject: `[StayApp] Nuova richiesta demo — ${nome.trim()}`,
        html: emailTemplate({
          title: 'Nuova richiesta demo',
          entityName: 'StayApp',
          rows: [
            { label: 'Nome',      value: nome.trim() },
            { label: 'Email',     value: `<a href="mailto:${email}" style="color:#1A6490">${email}</a>` },
            { label: 'Telefono',  value: telefono?.trim() || '—' },
            { label: 'Attività',  value: tipo_attivita?.trim() || '—' },
            { label: 'Messaggio', value: messaggio?.trim() ? messaggio.replace(/\n/g, '<br>') : '—' },
          ],
          appUrl: process.env.APP_URL || 'https://stayapp.it',
        }),
      })
    } catch (err) { console.error('[demo email]', err.message) }
  }

  res.status(201).json({ ok: true })
})

// GET /api/demo — lista richieste (solo super_admin)
router.get('/', requireAuth, async (req, res) => {
  if (!await assertSuperAdmin(req.user.id)) return res.status(403).json({ error: 'Accesso negato' })

  const { data, error } = await supabase
    .from('demo_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

// PATCH /api/demo/:id — segna letto/non letto
router.patch('/:id', requireAuth, async (req, res) => {
  if (!await assertSuperAdmin(req.user.id)) return res.status(403).json({ error: 'Accesso negato' })

  const { data, error } = await supabase
    .from('demo_requests')
    .update({ letto: req.body.letto ?? true })
    .eq('id', req.params.id)
    .select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// DELETE /api/demo/:id — elimina
router.delete('/:id', requireAuth, async (req, res) => {
  if (!await assertSuperAdmin(req.user.id)) return res.status(403).json({ error: 'Accesso negato' })
  const { error } = await supabase.from('demo_requests').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

export default router
