import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../lib/supabase.js'
import { Resend } from 'resend'

const router = Router()
const resend = new Resend(process.env.RESEND_API_KEY)

// ── Admin: lista form ─────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabase.from('profiles').select('azienda_id').eq('id', req.user.id).single()
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })

    const { data, error } = await supabase
      .from('form_builder')
      .select('id, nome, descrizione, attivo, token, created_at, updated_at')
      .eq('azienda_id', profile.azienda_id)
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Admin: singolo form ───────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabase.from('profiles').select('azienda_id').eq('id', req.user.id).single()
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })

    const { data, error } = await supabase
      .from('form_builder')
      .select('*')
      .eq('id', req.params.id)
      .eq('azienda_id', profile.azienda_id)
      .single()
    if (error) return res.status(404).json({ error: 'Non trovato' })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Admin: crea form ──────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabase.from('profiles').select('azienda_id').eq('id', req.user.id).single()
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })

    const { data, error } = await supabase
      .from('form_builder')
      .insert({ azienda_id: profile.azienda_id, nome: req.body.nome || 'Nuovo form', campi: [] })
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Admin: aggiorna form ──────────────────────────────────────────────────────
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabase.from('profiles').select('azienda_id').eq('id', req.user.id).single()
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })

    const allowed = ['nome', 'descrizione', 'campi', 'redirect_url', 'email_notifica', 'attivo']
    const patch = { updated_at: new Date().toISOString() }
    for (const k of allowed) if (k in req.body) patch[k] = req.body[k]

    const { data, error } = await supabase
      .from('form_builder')
      .update(patch)
      .eq('id', req.params.id)
      .eq('azienda_id', profile.azienda_id)
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Admin: elimina form ───────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabase.from('profiles').select('azienda_id').eq('id', req.user.id).single()
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })

    const { error } = await supabase
      .from('form_builder')
      .delete()
      .eq('id', req.params.id)
      .eq('azienda_id', profile.azienda_id)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Admin: submissions di un form ─────────────────────────────────────────────
router.get('/:id/submissions', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabase.from('profiles').select('azienda_id').eq('id', req.user.id).single()
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })

    const { data: form } = await supabase
      .from('form_builder')
      .select('id')
      .eq('id', req.params.id)
      .eq('azienda_id', profile.azienda_id)
      .single()
    if (!form) return res.status(403).json({ error: 'Accesso negato' })

    const limit = Math.min(Number(req.query.limit) || 50, 200)
    const offset = Number(req.query.offset) || 0

    const { data, count, error } = await supabase
      .from('form_submissions')
      .select('*', { count: 'exact' })
      .eq('form_id', req.params.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ data, count, limit, offset })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Pubblico: leggi form via token ────────────────────────────────────────────
router.get('/public/:token', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('form_builder')
      .select('id, nome, descrizione, campi, redirect_url, attivo')
      .eq('token', req.params.token)
      .single()
    if (error || !data) return res.status(404).json({ error: 'Form non trovato' })
    if (!data.attivo) return res.status(403).json({ error: 'Form non attivo' })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Pubblico: invia form ──────────────────────────────────────────────────────
router.post('/public/:token/submit', async (req, res) => {
  try {
    const { data: form } = await supabase
      .from('form_builder')
      .select('id, azienda_id, nome, campi, redirect_url, email_notifica')
      .eq('token', req.params.token)
      .single()
    if (!form) return res.status(404).json({ error: 'Form non trovato' })

    const dati = req.body || {}

    // Cerca email nel payload per creare/aggiornare contatto
    let contattoId = null
    const emailCampo = form.campi.find(c => c.tipo === 'email')
    const email = emailCampo ? dati[emailCampo.id]?.trim() : null
    const nomeCampo = form.campi.find(c => c.tipo === 'text' && c.label.toLowerCase().includes('nome'))
    const nome = nomeCampo ? dati[nomeCampo.id]?.trim() : null
    const telCampo = form.campi.find(c => c.tipo === 'tel')
    const telefono = telCampo ? dati[telCampo.id]?.trim() : null

    if (email) {
      const { data: existing } = await supabase
        .from('contatti')
        .select('id')
        .eq('azienda_id', form.azienda_id)
        .eq('email', email)
        .maybeSingle()

      if (existing) {
        contattoId = existing.id
      } else {
        const { data: newContatto } = await supabase
          .from('contatti')
          .insert({ azienda_id: form.azienda_id, email, nome: nome || email, telefono: telefono || null, fonte: 'form' })
          .select('id')
          .single()
        contattoId = newContatto?.id || null
      }
    }

    // Salva submission
    const { error: subErr } = await supabase
      .from('form_submissions')
      .insert({
        form_id: form.id,
        azienda_id: form.azienda_id,
        dati,
        contatto_id: contattoId,
        ip: req.ip,
      })
    if (subErr) return res.status(500).json({ error: subErr.message })

    // Email notifica admin
    if (form.email_notifica && process.env.RESEND_API_KEY) {
      const righe = form.campi.map(c => `<tr><td style="padding:4px 8px;color:#888">${c.label}</td><td style="padding:4px 8px">${dati[c.id] ?? ''}</td></tr>`).join('')
      resend.emails.send({
        from: process.env.RESEND_FROM || 'noreply@stayapp.it',
        to: form.email_notifica,
        subject: `Nuova risposta al form: ${form.nome}`,
        html: `<h3>Nuova risposta ricevuta</h3><table>${righe}</table>`,
      }).catch(() => {})
    }

    res.json({ ok: true, redirect_url: form.redirect_url || null })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

export default router
