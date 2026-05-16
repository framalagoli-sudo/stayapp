import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'
import { triggerAutomazione } from '../lib/automazioni.js'

const router = Router()

async function getProfile(userId) {
  const { data } = await supabase.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

// GET /api/automazioni?entity_tipo=&entity_id=
router.get('/', requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })

    let q = supabase.from('automazioni').select('*').order('created_at', { ascending: false })

    if (profile.role !== 'super_admin') {
      if (!profile.azienda_id) return res.json([])
      q = q.eq('azienda_id', profile.azienda_id)
    }
    if (req.query.entity_tipo) q = q.eq('entity_tipo', req.query.entity_tipo)
    if (req.query.entity_id)   q = q.eq('entity_id', req.query.entity_id)

    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/automazioni
router.post('/', requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Accesso negato' })

    const { nome, entity_tipo, entity_id, trigger_evento, steps } = req.body
    if (!entity_tipo || !entity_id) return res.status(400).json({ error: 'entity_tipo e entity_id obbligatori' })
    if (!trigger_evento) return res.status(400).json({ error: 'trigger_evento obbligatorio' })

    const VALID_TRIGGERS = ['nuova_prenotazione','nuovo_contatto','pre_visita','post_visita']
    if (!VALID_TRIGGERS.includes(trigger_evento)) return res.status(400).json({ error: 'trigger_evento non valido' })

    const { data, error } = await supabase.from('automazioni').insert({
      azienda_id: profile.azienda_id,
      nome: nome?.trim() || '',
      entity_tipo,
      entity_id,
      trigger_evento,
      attiva: true,
      steps: Array.isArray(steps) ? steps : [],
    }).select().single()

    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// PATCH /api/automazioni/:id
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Accesso negato' })

    const allowed = ['nome', 'attiva', 'steps', 'trigger_evento']
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))
    updates.updated_at = new Date().toISOString()

    let q = supabase.from('automazioni').update(updates).eq('id', req.params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)

    const { data, error } = await q.select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// DELETE /api/automazioni/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Accesso negato' })

    let q = supabase.from('automazioni').delete().eq('id', req.params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)

    const { error } = await q
    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/automazioni/:id/test — invia email di test al proprio indirizzo
router.post('/:id/test', requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Accesso negato' })

    let q = supabase.from('automazioni').select('*').eq('id', req.params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
    const { data: auto, error } = await q.single()
    if (error || !auto) return res.status(404).json({ error: 'Automazione non trovata' })

    const testEmail = req.body.email
    if (!testEmail) return res.status(400).json({ error: 'email obbligatoria' })

    // Simula trigger con dati demo
    const testVars = {
      nome: 'Mario Rossi',
      email: testEmail,
      data: new Date().toLocaleDateString('it-IT'),
      ora: '10:00',
      servizio: 'Servizio di esempio',
      n_persone: '2',
      note: '',
      source_tipo: 'test',
      source_id: null,
      visit_datetime: new Date(Date.now() + 86400_000).toISOString(),
    }

    // Crea log entries con scheduled_at = now (invio immediato)
    const now = new Date()
    const steps = Array.isArray(auto.steps) ? auto.steps : []
    if (!steps.length) return res.status(400).json({ error: 'Nessuno step configurato' })

    const logs = steps.map((_, idx) => ({
      automazione_id: auto.id,
      step_index: idx,
      source_tipo: 'test',
      source_id: null,
      contact_email: testEmail,
      contact_nome: 'Mario Rossi',
      vars: testVars,
      scheduled_at: now.toISOString(),
    }))

    await supabase.from('automazioni_log').insert(logs)

    res.json({ ok: true, steps_queued: logs.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/automazioni/:id/log — ultime 50 esecuzioni
router.get('/:id/log', requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Accesso negato' })

    let q = supabase.from('automazioni').select('id').eq('id', req.params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
    const { data: auto } = await q.single()
    if (!auto) return res.status(404).json({ error: 'Non trovata' })

    const { data, error } = await supabase
      .from('automazioni_log')
      .select('id, step_index, contact_email, contact_nome, scheduled_at, sent_at, status, error_msg, created_at')
      .eq('automazione_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return res.status(500).json({ error: error.message })
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
export { triggerAutomazione }
