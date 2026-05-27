import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../lib/supabase.js'

const router = Router()

const ALLOWED_STATO = new Set(['bozza', 'pianificato', 'in_revisione', 'pubblicato'])

async function getAziendaId(userId) {
  const { data } = await supabase.from('profiles').select('azienda_id').eq('id', userId).single()
  return data?.azienda_id || null
}

// ── Lista post ────────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })

    let q = supabase
      .from('piano_editoriale')
      .select('*')
      .eq('azienda_id', azienda_id)
      .order('data_pianificata', { ascending: true, nullsFirst: false })

    if (req.query.stato) q = q.eq('stato', req.query.stato)
    if (req.query.label) q = q.contains('labels', [req.query.label])

    if (req.query.senza_data) {
      q = q.is('data_pianificata', null)
    } else if (req.query.da && req.query.a) {
      q = q.gte('data_pianificata', req.query.da).lte('data_pianificata', req.query.a + 'T23:59:59')
    } else if (req.query.mese) {
      const [year, month] = req.query.mese.split('-')
      const from = `${year}-${month}-01`
      const to   = new Date(year, month, 1).toISOString().slice(0, 10)
      q = q.gte('data_pianificata', from).lt('data_pianificata', to)
    }

    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Idee ──────────────────────────────────────────────────────────────────────
router.get('/idee', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })
    const { data, error } = await supabase
      .from('idee_editoriali')
      .select('*')
      .eq('azienda_id', azienda_id)
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/idee', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })
    const { titolo, note, pillar, canali } = req.body
    const { data, error } = await supabase
      .from('idee_editoriali')
      .insert({ azienda_id, titolo: titolo || '', note: note || '', pillar: pillar || '', canali: canali || [] })
      .select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.patch('/idee/:id', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })
    const allowed = ['titolo', 'note', 'pillar', 'canali']
    const patch = { updated_at: new Date().toISOString() }
    for (const k of allowed) if (k in req.body) patch[k] = req.body[k]
    const { data, error } = await supabase
      .from('idee_editoriali')
      .update(patch)
      .eq('id', req.params.id)
      .eq('azienda_id', azienda_id)
      .select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/idee/:id', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })
    const { error } = await supabase
      .from('idee_editoriali')
      .delete()
      .eq('id', req.params.id)
      .eq('azienda_id', azienda_id)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/idee/:id/pianifica', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })
    const { data: idea, error: ideaErr } = await supabase
      .from('idee_editoriali')
      .select('*')
      .eq('id', req.params.id)
      .eq('azienda_id', azienda_id)
      .single()
    if (ideaErr || !idea) return res.status(404).json({ error: 'Idea non trovata' })

    const { data_pianificata } = req.body
    const { data: post, error: postErr } = await supabase
      .from('piano_editoriale')
      .insert({
        azienda_id,
        titolo: idea.titolo,
        testo:  idea.note || '',
        canali: idea.canali || [],
        pillar: idea.pillar || '',
        data_pianificata: data_pianificata || null,
        stato: 'bozza',
        note: '',
        labels: [],
      })
      .select().single()
    if (postErr) return res.status(500).json({ error: postErr.message })
    await supabase.from('idee_editoriali').delete().eq('id', idea.id)
    res.status(201).json(post)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Singolo post ──────────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })
    const { data, error } = await supabase
      .from('piano_editoriale')
      .select('*')
      .eq('id', req.params.id)
      .eq('azienda_id', azienda_id)
      .single()
    if (error) return res.status(404).json({ error: 'Non trovato' })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Crea post ─────────────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })

    const { titolo, testo, immagine_url, canali, data_pianificata, stato, note, labels, pillar } = req.body
    const stato_safe = ALLOWED_STATO.has(stato) ? stato : 'bozza'

    const { data, error } = await supabase
      .from('piano_editoriale')
      .insert({
        azienda_id,
        titolo:          titolo || '',
        testo:           testo || '',
        immagine_url:    immagine_url || '',
        canali:          Array.isArray(canali) ? canali : [],
        data_pianificata: data_pianificata || null,
        stato:           stato_safe,
        note:            note || '',
        labels:          Array.isArray(labels) ? labels : [],
        pillar:          pillar || '',
      })
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Duplica post ──────────────────────────────────────────────────────────────
router.post('/:id/duplica', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })

    const { data: orig, error: origErr } = await supabase
      .from('piano_editoriale')
      .select('*')
      .eq('id', req.params.id)
      .eq('azienda_id', azienda_id)
      .single()
    if (origErr || !orig) return res.status(404).json({ error: 'Post non trovato' })

    const { data: copy, error: copyErr } = await supabase
      .from('piano_editoriale')
      .insert({
        azienda_id,
        titolo:          orig.titolo ? `Copia — ${orig.titolo}` : '',
        testo:           orig.testo || '',
        immagine_url:    orig.immagine_url || '',
        canali:          orig.canali || [],
        data_pianificata: null,
        stato:           'bozza',
        note:            orig.note || '',
        labels:          orig.labels || [],
        pillar:          orig.pillar || '',
      })
      .select()
      .single()
    if (copyErr) return res.status(500).json({ error: copyErr.message })
    res.status(201).json(copy)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Aggiorna post ─────────────────────────────────────────────────────────────
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })

    const allowed = ['titolo', 'testo', 'immagine_url', 'canali', 'data_pianificata', 'stato', 'note', 'labels', 'pillar']
    const patch = { updated_at: new Date().toISOString() }
    for (const k of allowed) if (k in req.body) patch[k] = req.body[k]
    if (patch.stato !== undefined && !ALLOWED_STATO.has(patch.stato)) delete patch.stato

    const { data, error } = await supabase
      .from('piano_editoriale')
      .update(patch)
      .eq('id', req.params.id)
      .eq('azienda_id', azienda_id)
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Elimina post ──────────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })
    const { error } = await supabase
      .from('piano_editoriale')
      .delete()
      .eq('id', req.params.id)
      .eq('azienda_id', azienda_id)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

export default router
