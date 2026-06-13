import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

export async function POST(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    if (!profile?.azienda_id) return Response.json({ error: 'Accesso negato' }, { status: 403 })

    let q = supabaseAdmin.from('automazioni').select('*').eq('id', params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
    const { data: auto, error } = await q.single()
    if (error || !auto) return Response.json({ error: 'Automazione non trovata' }, { status: 404 })

    const { email } = await request.json()
    if (!email) return Response.json({ error: 'email obbligatoria' }, { status: 400 })

    const steps = Array.isArray(auto.steps) ? auto.steps : []
    if (!steps.length) return Response.json({ error: 'Nessuno step configurato' }, { status: 400 })

    const testVars = {
      nome: 'Mario Rossi', email,
      data: new Date().toLocaleDateString('it-IT'),
      ora: '10:00', servizio: 'Servizio di esempio', n_persone: '2', note: '',
      source_tipo: 'test', source_id: null,
      visit_datetime: new Date(Date.now() + 86400_000).toISOString(),
    }

    const now = new Date()
    const logs = steps.map((_, idx) => ({
      automazione_id: auto.id, step_index: idx,
      source_tipo: 'test', source_id: null,
      contact_email: email, contact_nome: 'Mario Rossi',
      vars: testVars, scheduled_at: now.toISOString(),
    }))
    await supabaseAdmin.from('automazioni_log').insert(logs)

    return Response.json({ ok: true, steps_queued: logs.length })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
