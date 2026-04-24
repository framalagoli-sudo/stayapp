import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// GET /api/messages?property_id=&session_id=
// - Con session_id: messaggi di una singola conversazione (guest o admin)
// - Senza session_id + auth: lista conversazioni per admin (ultima msg per sessione)
router.get('/', async (req, res) => {
  const { property_id, session_id } = req.query
  if (!property_id) return res.status(400).json({ error: 'property_id richiesto' })

  try {
    if (session_id) {
      // Singola conversazione
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('property_id', property_id)
        .eq('session_id', session_id)
        .order('created_at', { ascending: true })

      if (error) throw error
      return res.json(data)
    }

    // Lista conversazioni: ultima msg per ogni session_id
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('property_id', property_id)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Raggruppa per session_id, tieni solo l'ultima + conta unread
    const map = new Map()
    for (const msg of data) {
      if (!map.has(msg.session_id)) {
        map.set(msg.session_id, { last: msg, unread: 0 })
      }
      if (msg.sender === 'guest' && !msg.read_at) {
        map.get(msg.session_id).unread++
      }
    }

    const conversations = Array.from(map.values())
      .sort((a, b) => new Date(b.last.created_at) - new Date(a.last.created_at))

    return res.json(conversations)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/messages — invia messaggio (guest: no auth, staff: auth header opzionale)
router.post('/', async (req, res) => {
  const { property_id, session_id, guest_name, sender, body } = req.body
  if (!property_id || !session_id || !sender || !body?.trim()) {
    return res.status(400).json({ error: 'Campi mancanti' })
  }
  if (!['guest', 'staff'].includes(sender)) {
    return res.status(400).json({ error: 'sender non valido' })
  }

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({ property_id, session_id, guest_name: guest_name || null, sender, body: body.trim() })
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PATCH /api/messages/read — segna come letti i messaggi guest di una sessione
router.patch('/read', requireAuth, async (req, res) => {
  const { property_id, session_id } = req.body
  if (!property_id || !session_id) return res.status(400).json({ error: 'Campi mancanti' })

  try {
    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('property_id', property_id)
      .eq('session_id', session_id)
      .eq('sender', 'guest')
      .is('read_at', null)

    if (error) throw error
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
