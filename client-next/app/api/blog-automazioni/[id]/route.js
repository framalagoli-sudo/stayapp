import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { calcNextRun } from '@/lib/blog-scheduler'

async function getAziendaId(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', userId).single()
  return data?.azienda_id || null
}

export async function PATCH(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const azienda_id = await getAziendaId(user.id)
    if (!azienda_id) return Response.json({ error: 'Non autorizzato' }, { status: 403 })

    const body = await request.json()
    const allowed = ['attiva', 'frequenza', 'ora_pubblicazione', 'giorno_settimana', 'giorno_mese', 'argomenti', 'modalita', 'notifica_email', 'entity_nome']
    const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))
    updates.updated_at = new Date().toISOString()

    const scheduleFields = ['frequenza', 'ora_pubblicazione', 'giorno_settimana', 'giorno_mese']
    if (scheduleFields.some(f => f in updates)) {
      const { data: cur } = await supabaseAdmin.from('blog_automazioni').select('*').eq('id', params.id).single()
      if (cur) {
        const freq = updates.frequenza          || cur.frequenza
        const ora  = updates.ora_pubblicazione  ?? cur.ora_pubblicazione
        const gs   = updates.giorno_settimana   ?? cur.giorno_settimana
        const gm   = updates.giorno_mese        ?? cur.giorno_mese
        updates.next_run_at = calcNextRun(freq, ora, gs, gm).toISOString()
      }
    }

    const { data, error } = await supabaseAdmin.from('blog_automazioni')
      .update(updates).eq('id', params.id).eq('azienda_id', azienda_id).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const azienda_id = await getAziendaId(user.id)
    if (!azienda_id) return Response.json({ error: 'Non autorizzato' }, { status: 403 })
    const { error } = await supabaseAdmin.from('blog_automazioni')
      .delete().eq('id', params.id).eq('azienda_id', azienda_id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
