import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

function emptyResponse(range, now) {
  const daily = []
  for (let i = range - 1; i >= 0; i--) daily.push({ date: new Date(now - i * 86400000).toISOString().split('T')[0], count: 0 })
  return { range, pageviews: { total: 0, prev_total: 0, daily }, requests: { total: 0, open: 0, by_type: { reception: 0, maintenance: 0, housekeeping: 0, other: 0 }, daily }, bookings: { total: 0, by_status: { open: 0, in_progress: 0, resolved: 0, cancelled: 0 } }, newsletter: { subscribers: 0, sent_period: 0 }, contacts: { total: 0, new_period: 0 } }
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const range = Math.min(parseInt(searchParams.get('range')) || 30, 365)
    const now = new Date()
    const since     = new Date(now - range * 86400000).toISOString()
    const prevSince = new Date(now - range * 2 * 86400000).toISOString()

    const isSuperAdmin = profile.role === 'super_admin'
    const azienda_id   = isSuperAdmin
      ? (searchParams.get('azienda_id') || null)
      : profile.azienda_id

    let propertyIds = [], ristoranteIds = [], attivitaIds = []
    if (!isSuperAdmin || azienda_id) {
      if (!azienda_id) return Response.json(emptyResponse(range, now))
      const [p, r, a] = await Promise.all([
        supabaseAdmin.from('properties').select('id').eq('azienda_id', azienda_id),
        supabaseAdmin.from('ristoranti').select('id').eq('azienda_id', azienda_id),
        supabaseAdmin.from('attivita').select('id').eq('azienda_id', azienda_id),
      ])
      propertyIds   = (p.data || []).map(x => x.id)
      ristoranteIds = (r.data || []).map(x => x.id)
      attivitaIds   = (a.data || []).map(x => x.id)
    }
    const allEntityIds = [...propertyIds, ...ristoranteIds, ...attivitaIds]
    if (azienda_id && !allEntityIds.length) return Response.json(emptyResponse(range, now))

    let pvQ = supabaseAdmin.from('page_views').select('viewed_at').gte('viewed_at', since)
    let pvPrevQ = supabaseAdmin.from('page_views').select('id', { count: 'exact', head: true }).gte('viewed_at', prevSince).lt('viewed_at', since)
    if (allEntityIds.length) { pvQ = pvQ.in('entity_id', allEntityIds); pvPrevQ = pvPrevQ.in('entity_id', allEntityIds) }
    const [pvRes, pvPrevRes] = await Promise.all([pvQ, pvPrevQ])
    const pvRows = pvRes.data || []
    const pvByDate = {}
    pvRows.forEach(r => { const d = r.viewed_at.split('T')[0]; pvByDate[d] = (pvByDate[d] || 0) + 1 })
    const pvDaily = []
    for (let i = range - 1; i >= 0; i--) { const d = new Date(now - i * 86400000).toISOString().split('T')[0]; pvDaily.push({ date: d, count: pvByDate[d] || 0 }) }

    let reqQ = supabaseAdmin.from('requests').select('type, status, message, created_at').gte('created_at', since)
    if (propertyIds.length) reqQ = reqQ.in('property_id', propertyIds)
    else if (azienda_id) reqQ = reqQ.eq('property_id', 'none')
    const { data: reqAll = [] } = await reqQ
    const requests = reqAll.filter(r => !r.message?.startsWith('[Prenotazione') && !r.message?.startsWith('[Interesse offerta'))
    const bookings = reqAll.filter(r =>  r.message?.startsWith('[Prenotazione') ||  r.message?.startsWith('[Interesse offerta'))
    const reqByType = { reception: 0, maintenance: 0, housekeeping: 0, other: 0 }
    requests.forEach(r => { if (r.type in reqByType) reqByType[r.type]++ })
    const bookByStatus = { open: 0, in_progress: 0, resolved: 0, cancelled: 0 }
    bookings.forEach(b => { if (b.status in bookByStatus) bookByStatus[b.status]++ })
    const reqByDate = {}
    requests.forEach(r => { const d = r.created_at.split('T')[0]; reqByDate[d] = (reqByDate[d] || 0) + 1 })
    const reqDaily = []
    for (let i = range - 1; i >= 0; i--) { const d = new Date(now - i * 86400000).toISOString().split('T')[0]; reqDaily.push({ date: d, count: reqByDate[d] || 0 }) }

    let nlSubscribers = 0, nlSent = 0, contactsTotal = 0, contactsNew = 0
    if (azienda_id) {
      const [sub, sent, ctot, cnew] = await Promise.all([
        supabaseAdmin.from('contatti').select('*', { count: 'exact', head: true }).eq('azienda_id', azienda_id).eq('iscritto_newsletter', true),
        supabaseAdmin.from('newsletters').select('*', { count: 'exact', head: true }).eq('azienda_id', azienda_id).eq('status', 'sent').gte('sent_at', since),
        supabaseAdmin.from('contatti').select('*', { count: 'exact', head: true }).eq('azienda_id', azienda_id),
        supabaseAdmin.from('contatti').select('*', { count: 'exact', head: true }).eq('azienda_id', azienda_id).gte('created_at', since),
      ])
      nlSubscribers = sub.count || 0; nlSent = sent.count || 0; contactsTotal = ctot.count || 0; contactsNew = cnew.count || 0
    }

    return Response.json({ range, pageviews: { total: pvRows.length, prev_total: pvPrevRes.count || 0, daily: pvDaily }, requests: { total: requests.length, open: requests.filter(r => r.status === 'open').length, by_type: reqByType, daily: reqDaily }, bookings: { total: bookings.length, by_status: bookByStatus }, newsletter: { subscribers: nlSubscribers, sent_period: nlSent }, contacts: { total: contactsTotal, new_period: contactsNew } })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
