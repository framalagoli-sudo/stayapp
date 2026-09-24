import { supabaseAdmin } from '@/lib/supabase-server'
import { requireSuperAdmin } from '@/lib/server-auth'
import { logError } from '@/lib/observability'
import { validaProfilo, COLONNE_PROFILO } from '@/lib/profili-mestiere'

// Un profilo di mestiere: modifica e cancellazione, solo per il super_admin.
// Ogni modifica alza la versione: nella fase F4 chi è nato da un profilo potrà
// sapere che il profilo è cambiato dopo di lui.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(request, props) {
  const { id } = await props.params
  try {
    const { response } = await requireSuperAdmin(request)
    if (response) return response
    if (!UUID.test(id)) return Response.json({ error: 'Non trovato' }, { status: 404 })
    const body = await request.json().catch(() => null)
    const { dati, errore } = validaProfilo(body, { nuovo: false })
    if (errore) return Response.json({ error: errore }, { status: 400 })
    if (!Object.keys(dati).length) return Response.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })

    const { data: prima } = await supabaseAdmin.from('profili_mestiere').select('versione').eq('id', id).maybeSingle()
    if (!prima) return Response.json({ error: 'Non trovato' }, { status: 404 })
    const { data, error } = await supabaseAdmin.from('profili_mestiere')
      .update({ ...dati, versione: prima.versione + 1, updated_at: new Date().toISOString() })
      .eq('id', id).select(COLONNE_PROFILO).single()
    if (error) throw error
    return Response.json(data)
  } catch (err) {
    logError('profili-mestiere', err)
    return Response.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function DELETE(request, props) {
  const { id } = await props.params
  try {
    const { response } = await requireSuperAdmin(request)
    if (response) return response
    if (!UUID.test(id)) return Response.json({ error: 'Non trovato' }, { status: 404 })
    // Un profilo in uso non si elimina: le entità perderebbero la categoria e le
    // funzioni della loro azienda resterebbero quelle di prima, senza che niente
    // lo dica. Prima si cambia categoria alle entità, poi si elimina.
    const { data: profilo } = await supabaseAdmin.from('profili_mestiere').select('chiave').eq('id', id).maybeSingle()
    if (!profilo) return Response.json({ error: 'Non trovato' }, { status: 404 })
    const { count } = await supabaseAdmin.from('entita').select('*', { count: 'exact', head: true }).eq('profilo', profilo.chiave)
    if (count) return Response.json({ error: `È la categoria di ${count} entità: prima assegnane un'altra, poi eliminalo.` }, { status: 409 })
    const { data, error } = await supabaseAdmin.from('profili_mestiere').delete().eq('id', id).select('id')
    if (error) throw error
    if (!data?.length) return Response.json({ error: 'Non trovato' }, { status: 404 })
    return Response.json({ success: true })
  } catch (err) {
    logError('profili-mestiere', err)
    return Response.json({ error: 'Errore interno' }, { status: 500 })
  }
}
