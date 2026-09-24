import { supabaseAdmin } from '@/lib/supabase-server'
import { requireSuperAdmin } from '@/lib/server-auth'
import { logError } from '@/lib/observability'
import { validaProfilo, COLONNE_PROFILO } from '@/lib/profili-mestiere'

// I profili di mestiere, solo per il super_admin (STRATEGIA.md §6.1, fase F2).
// In questa fase si scrivono e si guardano: non si applicano a nessun cliente.

export async function GET(request) {
  try {
    const { response } = await requireSuperAdmin(request)
    if (response) return response
    const { data, error } = await supabaseAdmin.from('profili_mestiere').select(COLONNE_PROFILO).order('ordine').order('nome')
    if (error) throw error
    return Response.json(data)
  } catch (err) {
    logError('profili-mestiere', err)
    return Response.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { response } = await requireSuperAdmin(request)
    if (response) return response
    const body = await request.json().catch(() => null)
    const { dati, errore } = validaProfilo(body, { nuovo: true })
    if (errore) return Response.json({ error: errore }, { status: 400 })
    const { data, error } = await supabaseAdmin.from('profili_mestiere').insert(dati).select(COLONNE_PROFILO).single()
    if (error?.code === '23505') return Response.json({ error: 'Esiste già un profilo con questa chiave' }, { status: 409 })
    if (error) throw error
    return Response.json(data, { status: 201 })
  } catch (err) {
    logError('profili-mestiere', err)
    return Response.json({ error: 'Errore interno' }, { status: 500 })
  }
}
