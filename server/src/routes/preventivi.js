import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../lib/supabase.js'
import { sendWebhooks } from '../lib/webhook.js'

const router = Router()

// ── Auto-numbering ───────────────────────────────────────────────────────────
async function nextNumero(azienda_id) {
  const year = new Date().getFullYear()
  const { count } = await supabase
    .from('preventivi')
    .select('id', { count: 'exact', head: true })
    .eq('azienda_id', azienda_id)
    .gte('created_at', `${year}-01-01`)
  const n = (count || 0) + 1
  return `PRE-${year}-${String(n).padStart(3, '0')}`
}

// ── Admin: lista ─────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabase.from('profiles').select('azienda_id, role').eq('id', req.user.id).single()
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })

    let q = supabase
      .from('preventivi')
      .select('id, numero, titolo, stato, valuta, iva_pct, voci, scadenza, created_at, updated_at, contatto_id, contatti(nome, email)')
      .eq('azienda_id', profile.azienda_id)
      .order('created_at', { ascending: false })

    if (req.query.stato) q = q.eq('stato', req.query.stato)

    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Admin: singolo ───────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabase.from('profiles').select('azienda_id').eq('id', req.user.id).single()
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })

    const { data, error } = await supabase
      .from('preventivi')
      .select('*, contatti(id, nome, email)')
      .eq('id', req.params.id)
      .eq('azienda_id', profile.azienda_id)
      .single()
    if (error) return res.status(404).json({ error: 'Non trovato' })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Admin: crea ──────────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabase.from('profiles').select('azienda_id').eq('id', req.user.id).single()
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })

    const numero = await nextNumero(profile.azienda_id)
    const payload = {
      azienda_id: profile.azienda_id,
      numero,
      titolo: req.body.titolo || '',
      contatto_id: req.body.contatto_id || null,
      stato: 'bozza',
      valuta: req.body.valuta || 'EUR',
      iva_pct: req.body.iva_pct ?? 22,
      voci: req.body.voci || [],
      note: req.body.note || '',
      scadenza: req.body.scadenza || null,
    }

    const { data, error } = await supabase.from('preventivi').insert(payload).select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Admin: aggiorna ──────────────────────────────────────────────────────────
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabase.from('profiles').select('azienda_id').eq('id', req.user.id).single()
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })

    const allowed = ['titolo', 'contatto_id', 'stato', 'valuta', 'iva_pct', 'voci', 'note', 'scadenza']
    const patch = {}
    for (const k of allowed) if (k in req.body) patch[k] = req.body[k]
    patch.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('preventivi')
      .update(patch)
      .eq('id', req.params.id)
      .eq('azienda_id', profile.azienda_id)
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Admin: elimina ───────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabase.from('profiles').select('azienda_id').eq('id', req.user.id).single()
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })

    const { error } = await supabase
      .from('preventivi')
      .delete()
      .eq('id', req.params.id)
      .eq('azienda_id', profile.azienda_id)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Admin: invia (cambia stato → 'inviato') ──────────────────────────────────
router.post('/:id/invia', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabase.from('profiles').select('azienda_id').eq('id', req.user.id).single()
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })

    const { data, error } = await supabase
      .from('preventivi')
      .update({ stato: 'inviato', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('azienda_id', profile.azienda_id)
      .select('*, contatti(nome, email)')
      .single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Pubblico: visualizza preventivo via token ────────────────────────────────
router.get('/public/:token', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('preventivi')
      .select('id, numero, titolo, stato, valuta, iva_pct, voci, note, scadenza, accettato_at, firma_nome, aziende(ragione_sociale, email)')
      .eq('token', req.params.token)
      .single()
    if (error || !data) return res.status(404).json({ error: 'Preventivo non trovato' })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Pubblico: accetta preventivo ─────────────────────────────────────────────
router.post('/public/:token/accetta', async (req, res) => {
  try {
    const { firma_nome } = req.body
    if (!firma_nome?.trim()) return res.status(400).json({ error: 'Il campo firma è obbligatorio' })

    const { data: prev } = await supabase
      .from('preventivi')
      .select('id, stato, azienda_id')
      .eq('token', req.params.token)
      .single()
    if (!prev) return res.status(404).json({ error: 'Preventivo non trovato' })
    if (prev.stato === 'accettato') return res.status(400).json({ error: 'Già accettato' })
    if (prev.stato === 'scaduto' || prev.stato === 'rifiutato') {
      return res.status(400).json({ error: 'Preventivo non più accettabile' })
    }

    const { data, error } = await supabase
      .from('preventivi')
      .update({
        stato: 'accettato',
        accettato_at: new Date().toISOString(),
        firma_nome: firma_nome.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('token', req.params.token)
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })

    sendWebhooks(prev.azienda_id, 'preventivo_accettato', { preventivo_id: prev.id, firma_nome: firma_nome.trim() }).catch(() => {})
    res.json({ ok: true, accettato_at: data.accettato_at })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
