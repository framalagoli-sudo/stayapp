import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

async function getProfile(userId) {
  const { data } = await supabase.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

// Arricchisce ogni collegamento con nome/slug dell'entità "altra"
async function enrichLinks(links, tipo, id) {
  const result = []
  for (const link of links) {
    const isFrom = link.from_tipo === tipo && link.from_id === id
    const otherTipo = isFrom ? link.to_tipo : link.from_tipo
    const otherId   = isFrom ? link.to_id   : link.from_id

    let entity = null
    if (otherTipo === 'struttura') {
      const { data } = await supabase.from('properties').select('id, name, slug, logo_url').eq('id', otherId).single()
      entity = data
    } else if (otherTipo === 'ristorante') {
      const { data } = await supabase.from('ristoranti').select('id, name, slug, logo_url').eq('id', otherId).single()
      entity = data
    }
    if (entity) result.push({ id: link.id, tipo: otherTipo, ...entity })
  }
  return result
}

// GET /api/collegamenti?tipo=struttura&entity_id=xxx
router.get('/', async (req, res) => {
  const { tipo, entity_id } = req.query
  if (!tipo || !entity_id) return res.status(400).json({ error: 'tipo e entity_id obbligatori' })

  const { data: links, error } = await supabase
    .from('collegamenti')
    .select('*')
    .or(`and(from_tipo.eq.${tipo},from_id.eq.${entity_id}),and(to_tipo.eq.${tipo},to_id.eq.${entity_id})`)

  if (error) return res.status(500).json({ error: error.message })
  const enriched = await enrichLinks(links || [], tipo, entity_id)
  res.json(enriched)
})

// POST /api/collegamenti
router.post('/', async (req, res) => {
  const profile = await getProfile(req.user.id)
  if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })

  const { from_tipo, from_id, to_tipo, to_id, azienda_id } = req.body
  if (!from_tipo || !from_id || !to_tipo || !to_id || !azienda_id) {
    return res.status(400).json({ error: 'Campi mancanti' })
  }

  const allowedAziendaId = ['super_admin','admin','editor'].includes(profile.role)
    ? azienda_id
    : profile.azienda_id

  if (!allowedAziendaId) return res.status(403).json({ error: 'Permessi insufficienti' })

  const { data, error } = await supabase
    .from('collegamenti')
    .insert({ azienda_id: allowedAziendaId, from_tipo, from_id, to_tipo, to_id })
    .select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

// DELETE /api/collegamenti/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('collegamenti').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

export default router
