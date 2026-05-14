import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

function slugify(str) {
  return (str || '').toLowerCase()
    .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u').replace(/[ç]/g, 'c').replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'pagina'
}

// GET /api/pagine?entity_tipo=&entity_id=
router.get('/', async (req, res) => {
  try {
    const { entity_tipo, entity_id } = req.query
    if (!entity_tipo || !entity_id) return res.status(400).json({ error: 'entity_tipo e entity_id obbligatori' })
    const { data, error } = await supabase
      .from('pagine')
      .select('id, parent_id, slug, titolo, status, nel_menu, ordine, seo_title, seo_description, og_image_url, created_at, updated_at')
      .eq('entity_tipo', entity_tipo).eq('entity_id', entity_id)
      .order('ordine', { ascending: true })
    if (error) return res.status(500).json({ error: error.message })
    res.json(data || [])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/pagine/reorder — deve stare prima di /:id
router.post('/reorder', async (req, res) => {
  try {
    const { items } = req.body
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items array required' })
    await Promise.all(items.map(({ id, ordine, parent_id }) =>
      supabase.from('pagine').update({ ordine, parent_id: parent_id || null }).eq('id', id)
    ))
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/pagine
router.post('/', async (req, res) => {
  try {
    const { entity_tipo, entity_id, titolo, slug, parent_id, status, nel_menu } = req.body
    if (!entity_tipo || !entity_id || !titolo?.trim()) return res.status(400).json({ error: 'entity_tipo, entity_id e titolo obbligatori' })
    const { data: existing } = await supabase.from('pagine').select('ordine').eq('entity_tipo', entity_tipo).eq('entity_id', entity_id).order('ordine', { ascending: false }).limit(1)
    const nextOrdine = (existing?.[0]?.ordine ?? -1) + 1
    const { data, error } = await supabase.from('pagine').insert({
      entity_tipo, entity_id,
      titolo: titolo.trim(),
      slug: slug?.trim() || slugify(titolo),
      parent_id: parent_id || null,
      status: status || 'bozza',
      nel_menu: nel_menu !== false,
      ordine: nextOrdine,
    }).select().single()
    if (error) return res.status(400).json({ error: error.message })
    res.status(201).json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/pagine/:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('pagine').select('*').eq('id', req.params.id).single()
    if (error || !data) return res.status(404).json({ error: 'Pagina non trovata' })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PATCH /api/pagine/:id
router.patch('/:id', async (req, res) => {
  try {
    const ALLOWED = ['titolo','slug','status','nel_menu','ordine','parent_id','seo_title','seo_description','og_image_url','blocks']
    const updates = {}
    ALLOWED.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k] })
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'Nessun campo' })
    const { data, error } = await supabase.from('pagine').update(updates).eq('id', req.params.id).select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/pagine/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('pagine').delete().eq('id', req.params.id)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

export default router
