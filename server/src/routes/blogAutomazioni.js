import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'
import { calcNextRun } from '../lib/blogScheduler.js'

const router = Router()

async function getAziendaId(userId) {
  const { data } = await supabase.from('profiles').select('azienda_id').eq('id', userId).single()
  return data?.azienda_id || null
}

// GET /api/blog-automazioni
router.get('/', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.json([])
    const { data, error } = await supabase.from('blog_automazioni')
      .select('*')
      .eq('azienda_id', azienda_id)
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/blog-automazioni
router.post('/', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Non autorizzato' })

    const {
      entity_tipo, entity_id, entity_nome,
      frequenza = 'settimanale',
      ora_pubblicazione = 9,
      giorno_settimana = 1,
      giorno_mese = 1,
      argomenti = [],
      modalita = 'bozza',
      notifica_email,
    } = req.body

    if (!entity_tipo || !entity_id) return res.status(400).json({ error: 'entity_tipo e entity_id obbligatori' })

    const next = calcNextRun(frequenza, ora_pubblicazione, giorno_settimana, giorno_mese)

    const { data, error } = await supabase.from('blog_automazioni').insert({
      azienda_id, entity_tipo, entity_id, entity_nome: entity_nome || null,
      frequenza, ora_pubblicazione, giorno_settimana, giorno_mese,
      argomenti, modalita,
      notifica_email: notifica_email || null,
      next_run_at: next.toISOString(),
    }).select().single()

    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// PATCH /api/blog-automazioni/:id
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Non autorizzato' })

    const allowed = ['attiva','frequenza','ora_pubblicazione','giorno_settimana','giorno_mese','argomenti','modalita','notifica_email','entity_nome']
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))
    updates.updated_at = new Date().toISOString()

    // Ricalcola next_run_at se cambiano i parametri di scheduling
    const scheduleFields = ['frequenza','ora_pubblicazione','giorno_settimana','giorno_mese']
    if (scheduleFields.some(f => f in updates)) {
      const { data: cur } = await supabase.from('blog_automazioni').select('*').eq('id', req.params.id).single()
      if (cur) {
        const freq = updates.frequenza         || cur.frequenza
        const ora  = updates.ora_pubblicazione ?? cur.ora_pubblicazione
        const gs   = updates.giorno_settimana  ?? cur.giorno_settimana
        const gm   = updates.giorno_mese       ?? cur.giorno_mese
        updates.next_run_at = calcNextRun(freq, ora, gs, gm).toISOString()
      }
    }

    const { data, error } = await supabase.from('blog_automazioni')
      .update(updates).eq('id', req.params.id).eq('azienda_id', azienda_id)
      .select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// DELETE /api/blog-automazioni/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Non autorizzato' })
    const { error } = await supabase.from('blog_automazioni')
      .delete().eq('id', req.params.id).eq('azienda_id', azienda_id)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
