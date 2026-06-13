import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { runBackup } from '@/lib/backup'

export async function POST(request) {
  const { user, response } = await requireAuth(request)
  if (response) return response
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return Response.json({ error: 'Accesso negato' }, { status: 403 })

  const log = []
  const _log = console.log.bind(console)
  const _err = console.error.bind(console)
  console.log = (...a) => { _log(...a); log.push(a.join(' ')) }
  console.error = (...a) => { _err(...a); log.push('ERROR: ' + a.join(' ')) }
  try {
    await runBackup()
    return Response.json({ ok: true, log })
  } catch (err) {
    log.push('THROWN: ' + err.message)
    return Response.json({ error: err.message, log }, { status: 500 })
  } finally {
    console.log = _log
    console.error = _err
  }
}
