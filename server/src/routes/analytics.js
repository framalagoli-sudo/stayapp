import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

async function getProfile(userId) {
  const { data } = await supabase.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

router.get('/', requireAuth, async (req, res) => {
  const profile = await getProfile(req.user.id)
  if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })

  const range = Math.min(parseInt(req.query.range) || 30, 365)
  const now = new Date()
  const since     = new Date(now - range * 86400000).toISOString()
  const prevSince = new Date(now - range * 2 * 86400000).toISOString()

  const isSuperAdmin = profile.role === 'super_admin'
  const azienda_id   = profile.azienda_id

  // ── Raccolta entity IDs dell'azienda ──
  let propertyIds = [], ristoranteIds = [], attivitaIds = []
  if (!isSuperAdmin) {
    if (!azienda_id) return res.json(emptyResponse(range, now))
    const [p, r, a] = await Promise.all([
      supabase.from('properties').select('id').eq('azienda_id', azienda_id),
      supabase.from('ristoranti').select('id').eq('azienda_id', azienda_id),
      supabase.from('attivita').select('id').eq('azienda_id', azienda_id),
    ])
    propertyIds   = (p.data || []).map(x => x.id)
    ristoranteIds = (r.data || []).map(x => x.id)
    attivitaIds   = (a.data || []).map(x => x.id)
  }
  const allEntityIds = [...propertyIds, ...ristoranteIds, ...attivitaIds]
  if (!isSuperAdmin && !allEntityIds.length) return res.json(emptyResponse(range, now))

  // ── Page views ──
  let pvQ = supabase.from('page_views').select('viewed_at').gte('viewed_at', since)
  let pvPrevQ = supabase.from('page_views').select('id', { count: 'exact', head: true }).gte('viewed_at', prevSince).lt('viewed_at', since)
  if (!isSuperAdmin) {
    pvQ     = pvQ.in('entity_id', allEntityIds)
    pvPrevQ = pvPrevQ.in('entity_id', allEntityIds)
  }
  const [pvRes, pvPrevRes] = await Promise.all([pvQ, pvPrevQ])
  const pvRows      = pvRes.data || []
  const pvPrevCount = pvPrevRes.count || 0

  const pvByDate = {}
  pvRows.forEach(r => { const d = r.viewed_at.split('T')[0]; pvByDate[d] = (pvByDate[d] || 0) + 1 })
  const pvDaily = []
  for (let i = range - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000).toISOString().split('T')[0]
    pvDaily.push({ date: d, count: pvByDate[d] || 0 })
  }

  // ── Requests ──
  let reqQ = supabase.from('requests').select('type, status, message, created_at').gte('created_at', since)
  if (!isSuperAdmin && propertyIds.length) reqQ = reqQ.in('property_id', propertyIds)
  else if (!isSuperAdmin) reqQ = reqQ.eq('property_id', 'none')
  const { data: reqAll = [] } = await reqQ

  const requests = reqAll.filter(r => !r.message?.startsWith('[Prenotazione') && !r.message?.startsWith('[Interesse offerta'))
  const bookings = reqAll.filter(r =>  r.message?.startsWith('[Prenotazione') ||  r.message?.startsWith('[Interesse offerta'))

  const reqByType = { reception: 0, maintenance: 0, housekeeping: 0, other: 0 }
  requests.forEach(r => { if (r.type in reqByType) reqByType[r.type]++ })

  const bookByStatus = { open: 0, in_progress: 0, resolved: 0, cancelled: 0 }
  bookings.forEach(b => { if (b.status in bookByStatus) bookByStatus[b.status]++ })

  const reqDaily = []
  const reqByDate = {}
  requests.forEach(r => { const d = r.created_at.split('T')[0]; reqByDate[d] = (reqByDate[d] || 0) + 1 })
  for (let i = range - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000).toISOString().split('T')[0]
    reqDaily.push({ date: d, count: reqByDate[d] || 0 })
  }

  // ── Newsletter + Contatti ──
  let nlSubscribers = 0, nlSent = 0, contactsTotal = 0, contactsNew = 0
  if (azienda_id) {
    const [sub, sent, ctot, cnew] = await Promise.all([
      supabase.from('contatti').select('*', { count: 'exact', head: true }).eq('azienda_id', azienda_id).eq('iscritto_newsletter', true),
      supabase.from('newsletters').select('*', { count: 'exact', head: true }).eq('azienda_id', azienda_id).eq('status', 'sent').gte('sent_at', since),
      supabase.from('contatti').select('*', { count: 'exact', head: true }).eq('azienda_id', azienda_id),
      supabase.from('contatti').select('*', { count: 'exact', head: true }).eq('azienda_id', azienda_id).gte('created_at', since),
    ])
    nlSubscribers  = sub.count  || 0
    nlSent         = sent.count || 0
    contactsTotal  = ctot.count || 0
    contactsNew    = cnew.count || 0
  }

  res.json({
    range,
    pageviews:  { total: pvRows.length, prev_total: pvPrevCount, daily: pvDaily },
    requests:   { total: requests.length, open: requests.filter(r => r.status === 'open').length, by_type: reqByType, daily: reqDaily },
    bookings:   { total: bookings.length, by_status: bookByStatus },
    newsletter: { subscribers: nlSubscribers, sent_period: nlSent },
    contacts:   { total: contactsTotal, new_period: contactsNew },
  })
})

function emptyResponse(range, now) {
  const daily = []
  for (let i = range - 1; i >= 0; i--) {
    daily.push({ date: new Date(now - i * 86400000).toISOString().split('T')[0], count: 0 })
  }
  return {
    range,
    pageviews:  { total: 0, prev_total: 0, daily },
    requests:   { total: 0, open: 0, by_type: { reception: 0, maintenance: 0, housekeeping: 0, other: 0 }, daily },
    bookings:   { total: 0, by_status: { open: 0, in_progress: 0, resolved: 0, cancelled: 0 } },
    newsletter: { subscribers: 0, sent_period: 0 },
    contacts:   { total: 0, new_period: 0 },
  }
}

export default router
