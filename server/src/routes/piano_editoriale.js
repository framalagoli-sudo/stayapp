import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../lib/supabase.js'

const router = Router()

async function getAziendaId(userId) {
  const { data } = await supabase.from('profiles').select('azienda_id').eq('id', userId).single()
  return data?.azienda_id || null
}

// ── Lista post (con filtri opzionali) ─────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })

    let q = supabase
      .from('piano_editoriale')
      .select('*')
      .eq('azienda_id', azienda_id)
      .order('data_pianificata', { ascending: true, nullsFirst: false })

    if (req.query.stato)  q = q.eq('stato', req.query.stato)
    if (req.query.mese) {
      // mese nel formato YYYY-MM
      const [year, month] = req.query.mese.split('-')
      const from = `${year}-${month}-01`
      const to   = new Date(year, month, 1).toISOString().slice(0, 10) // primo del mese successivo
      q = q.gte('data_pianificata', from).lt('data_pianificata', to)
    }

    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
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

    const { titolo, testo, immagine_url, canali, data_pianificata, stato, note } = req.body
    const { data, error } = await supabase
      .from('piano_editoriale')
      .insert({
        azienda_id,
        titolo: titolo || '',
        testo: testo || '',
        immagine_url: immagine_url || '',
        canali: canali || [],
        data_pianificata: data_pianificata || null,
        stato: stato || 'bozza',
        note: note || '',
      })
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Aggiorna post ─────────────────────────────────────────────────────────────
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })

    const allowed = ['titolo', 'testo', 'immagine_url', 'canali', 'data_pianificata', 'stato', 'note']
    const patch = { updated_at: new Date().toISOString() }
    for (const k of allowed) if (k in req.body) patch[k] = req.body[k]

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
