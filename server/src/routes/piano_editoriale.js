import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../lib/supabase.js'

const router = Router()

const ALLOWED_STATO = new Set(['bozza', 'pianificato', 'in_revisione', 'pubblicato'])

async function getProfile(userId) {
  const { data } = await supabase.from('profiles').select('azienda_id, full_name').eq('id', userId).single()
  return data || {}
}

async function getAziendaId(userId) {
  const { azienda_id } = await getProfile(userId)
  return azienda_id || null
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

    if (req.query.stato)       q = q.eq('stato', req.query.stato)
    if (req.query.campagna_id) q = q.eq('campagna_id', req.query.campagna_id)
    if (req.query.richiede_approvazione === 'true') q = q.eq('richiede_approvazione', true)
    if (req.query.label) q = q.contains('labels', [String(req.query.label).toLowerCase().trim()])

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

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })
    const { data, error } = await supabase
      .from('piano_editoriale')
      .select('stato, tipo_contenuto, canali, data_pianificata, created_at')
      .eq('azienda_id', azienda_id)
    if (error) return res.status(500).json({ error: error.message })
    res.json(data || [])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Hashtag sets ──────────────────────────────────────────────────────────────
router.get('/hashtag-sets', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })
    const { data, error } = await supabase
      .from('hashtag_sets')
      .select('*')
      .eq('azienda_id', azienda_id)
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    res.json(data || [])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/hashtag-sets', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })
    const { nome, canale, pillar, tags } = req.body
    const { data, error } = await supabase
      .from('hashtag_sets')
      .insert({ azienda_id, nome: nome || '', canale: canale || '', pillar: pillar || '', tags: Array.isArray(tags) ? tags : [] })
      .select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/hashtag-sets/:id', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })
    const { error } = await supabase
      .from('hashtag_sets')
      .delete()
      .eq('id', req.params.id)
      .eq('azienda_id', azienda_id)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Campagne ──────────────────────────────────────────────────────────────────
router.get('/campagne', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })
    const { data, error } = await supabase
      .from('pe_campagne')
      .select('*')
      .eq('azienda_id', azienda_id)
      .order('data_inizio', { ascending: true, nullsFirst: false })
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/campagne', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })
    const { nome, colore, data_inizio, data_fine, descrizione } = req.body
    if (!nome?.trim()) return res.status(400).json({ error: 'Nome obbligatorio' })
    const { data, error } = await supabase
      .from('pe_campagne')
      .insert({ azienda_id, nome: nome.trim(), colore: colore || '#6366f1', data_inizio: data_inizio || null, data_fine: data_fine || null, descrizione: descrizione || '' })
      .select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.patch('/campagne/:cid', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })
    const { nome, colore, data_inizio, data_fine, descrizione } = req.body
    const patch = {}
    if (nome !== undefined)        patch.nome = nome.trim()
    if (colore !== undefined)      patch.colore = colore
    if (data_inizio !== undefined) patch.data_inizio = data_inizio || null
    if (data_fine !== undefined)   patch.data_fine = data_fine || null
    if (descrizione !== undefined) patch.descrizione = descrizione
    patch.updated_at = new Date().toISOString()
    const { data, error } = await supabase
      .from('pe_campagne').update(patch).eq('id', req.params.cid).eq('azienda_id', azienda_id).select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/campagne/:cid', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })
    const { error } = await supabase
      .from('pe_campagne').delete().eq('id', req.params.cid).eq('azienda_id', azienda_id)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Commenti ──────────────────────────────────────────────────────────────────
router.get('/:id/commenti', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })
    const { data, error } = await supabase
      .from('pe_commenti')
      .select('*')
      .eq('post_id', req.params.id)
      .eq('azienda_id', azienda_id)
      .order('created_at', { ascending: true })
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/:id/commenti', requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (!profile.azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })
    const { testo } = req.body
    if (!testo?.trim()) return res.status(400).json({ error: 'Testo obbligatorio' })
    const { data, error } = await supabase
      .from('pe_commenti')
      .insert({ post_id: req.params.id, azienda_id: profile.azienda_id, author_id: req.user.id, author_name: profile.full_name || 'Utente', testo: testo.trim() })
      .select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id/commenti/:cid', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })
    const { error } = await supabase
      .from('pe_commenti')
      .delete()
      .eq('id', req.params.cid)
      .eq('azienda_id', azienda_id)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Refs interni per collegamento (articoli / newsletter / eventi) ─────────────
router.get('/refs', requireAuth, async (req, res) => {
  try {
    const azienda_id = await getAziendaId(req.user.id)
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })
    const { tipo } = req.query

    if (tipo === 'articolo') {
      const { data } = await supabase
        .from('articoli').select('id, titolo')
        .eq('azienda_id', azienda_id).order('created_at', { ascending: false }).limit(100)
      return res.json((data || []).map(r => ({ id: r.id, label: r.titolo })))
    }

    if (tipo === 'evento') {
      const { data } = await supabase
        .from('eventi').select('id, title')
        .eq('azienda_id', azienda_id).order('created_at', { ascending: false }).limit(100)
      return res.json((data || []).map(r => ({ id: r.id, label: r.title })))
    }

    if (tipo === 'newsletter') {
      // Newsletter sono per entità; raccogliamo gli ID di tutte le entità dell'azienda
      const [props, rists, atts] = await Promise.all([
        supabase.from('properties').select('id').eq('azienda_id', azienda_id),
        supabase.from('ristoranti').select('id').eq('azienda_id', azienda_id),
        supabase.from('attivita').select('id').eq('azienda_id', azienda_id),
      ])
      const entityIds = [
        ...(props.data || []), ...(rists.data || []), ...(atts.data || []),
      ].map(e => e.id)
      if (!entityIds.length) return res.json([])
      const { data } = await supabase
        .from('newsletters').select('id, subject')
        .in('entity_id', entityIds).order('created_at', { ascending: false }).limit(100)
      return res.json((data || []).map(r => ({ id: r.id, label: r.subject })))
    }

    res.json([])
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
    const profile = await getProfile(req.user.id)
    const azienda_id = profile.azienda_id
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })

    const { titolo, testo, immagine_url, canali, data_pianificata, stato, note, labels, pillar, design_url, tipo_contenuto, ref_id, ref_tipo, richiede_approvazione, campagna_id } = req.body
    const stato_safe = ALLOWED_STATO.has(stato) ? stato : 'bozza'
    const authorName = profile.full_name || 'Utente'

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
        labels:          Array.isArray(labels) ? labels.map(l => String(l).trim().toLowerCase().replace(/[^a-z0-9_àèìòù-]/g, '').slice(0, 50)).filter(Boolean) : [],
        pillar:          pillar || '',
        design_url:      design_url || '',
        tipo_contenuto:        tipo_contenuto || 'post',
        ref_id:                ref_id || null,
        ref_tipo:              ref_tipo || null,
        richiede_approvazione: richiede_approvazione === true,
        campagna_id:           campagna_id || null,
        created_by:            req.user.id,
        created_by_name: authorName,
        updated_by:      req.user.id,
        updated_by_name: authorName,
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
        design_url:      orig.design_url || '',
        tipo_contenuto:  orig.tipo_contenuto || 'post',
        ref_id:          orig.ref_id || null,
        ref_tipo:        orig.ref_tipo || null,
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
    const profile = await getProfile(req.user.id)
    const azienda_id = profile.azienda_id
    if (!azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })

    const allowed = ['titolo', 'testo', 'immagine_url', 'canali', 'data_pianificata', 'stato', 'note', 'labels', 'pillar', 'design_url', 'tipo_contenuto', 'ref_id', 'ref_tipo', 'richiede_approvazione', 'campagna_id']
    const patch = {
      updated_at:      new Date().toISOString(),
      updated_by:      req.user.id,
      updated_by_name: profile.full_name || 'Utente',
    }
    for (const k of allowed) if (k in req.body) patch[k] = req.body[k]
    if (patch.stato !== undefined && !ALLOWED_STATO.has(patch.stato)) delete patch.stato
    if (patch.labels !== undefined) {
      patch.labels = Array.isArray(patch.labels)
        ? patch.labels.map(l => String(l).trim().toLowerCase().replace(/[^a-z0-9_àèìòù-]/g, '').slice(0, 50)).filter(Boolean)
        : []
    }

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
