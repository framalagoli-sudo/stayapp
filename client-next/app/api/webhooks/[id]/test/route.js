import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

export async function POST(request, props) {
  const params = await props.params;
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    // Il super_admin non ha un'azienda propria: e' la sua condizione normale.
    // Scritta su `azienda_id`, questa guardia lo fermava in cima e rendeva
    // irraggiungibile il ramo `role !== 'super_admin'` qui sotto — un ramo mai
    // raggiunto non da errore, da silenzio.
    if (!profile || (profile.role !== 'super_admin' && !profile.azienda_id))
      return Response.json({ error: 'Accesso negato' }, { status: 403 })
    let q = supabaseAdmin.from('webhooks').select('*').eq('id', params.id)
    if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
    const { data: hook, error } = await q.single()
    if (error || !hook) return Response.json({ error: 'Webhook non trovato' }, { status: 404 })
    const body = JSON.stringify({ evento: 'test', timestamp: new Date().toISOString(), messaggio: 'Payload di test da OltreNova', azienda_id: hook.azienda_id })
    try {
      const resp = await fetch(hook.url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-OltreNova-Event': 'test' }, body, signal: AbortSignal.timeout(8000) })
      return Response.json({ ok: true, status: resp.status, statusText: resp.statusText })
    } catch (fetchErr) { return Response.json({ ok: false, error: fetchErr.message }, { status: 400 }) }
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
