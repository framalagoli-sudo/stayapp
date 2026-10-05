import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, getProfile, resolveAziendaId } from '@/lib/server-auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const AZIONI = ['etichetta', 'togli_etichetta', 'elimina']
// Quante schede per richiesta: abbastanza per una lista intera, non abbastanza
// per svuotare un'azienda con una chiamata sbagliata.
const MASSIMO = 500

// La stessa cosa su più contatti insieme: mettere o togliere un'etichetta, eliminare.
//
// 🔒 Gli id arrivano dal client e dicono QUALI, mai DI CHI: ogni scrittura è
// ristretta all'azienda di chi chiede. Un id di un'altra azienda non è un
// errore — semplicemente non viene toccato, e la risposta dice quanti lo sono
// stati davvero.
export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const body = await request.json()
    const aziendaId = resolveAziendaId(profile, body.azienda_id)
    if (!UUID_RE.test(aziendaId || '')) return Response.json({ error: 'Azienda non valida' }, { status: 400 })
    if (!AZIONI.includes(body.azione)) return Response.json({ error: 'Azione non valida' }, { status: 400 })
    const ids = [...new Set(Array.isArray(body.ids) ? body.ids.filter(x => UUID_RE.test(x || '')) : [])]
    if (!ids.length) return Response.json({ error: 'Nessun contatto scelto' }, { status: 400 })
    if (ids.length > MASSIMO) return Response.json({ error: `Al massimo ${MASSIMO} contatti per volta` }, { status: 400 })

    if (body.azione === 'elimina') {
      let fatti = 0
      for (let i = 0; i < ids.length; i += 100) {
        const { data, error } = await supabaseAdmin.from('contatti').delete().eq('azienda_id', aziendaId).in('id', ids.slice(i, i + 100)).select('id')
        if (error) return Response.json({ error: error.message, fatti }, { status: 500 })
        fatti += (data || []).length
      }
      return Response.json({ fatti })
    }

    const etichetta = String(body.etichetta || '').trim().toLowerCase().slice(0, 60)
    if (!etichetta) return Response.json({ error: 'Scrivi l’etichetta' }, { status: 400 })
    let fatti = 0
    for (let i = 0; i < ids.length; i += 100) {
      const { data: schede, error } = await supabaseAdmin.from('contatti').select('id, tags').eq('azienda_id', aziendaId).in('id', ids.slice(i, i + 100))
      if (error) return Response.json({ error: error.message, fatti }, { status: 500 })
      for (const c of schede || []) {
        const prima = Array.isArray(c.tags) ? c.tags : []
        const dopo = body.azione === 'etichetta' ? [...new Set([...prima, etichetta])] : prima.filter(t => String(t).trim().toLowerCase() !== etichetta)
        if (dopo.length === prima.length && body.azione === 'etichetta' && prima.includes(etichetta)) { fatti++; continue }
        const { error: e2 } = await supabaseAdmin.from('contatti').update({ tags: dopo, updated_at: new Date().toISOString() }).eq('id', c.id).eq('azienda_id', aziendaId)
        if (e2) return Response.json({ error: e2.message, fatti }, { status: 500 })
        fatti++
      }
    }
    return Response.json({ fatti })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
