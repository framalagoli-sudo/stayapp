import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, getProfile } from '@/lib/server-auth'
import { staffPuoLeggereContatti } from '@/lib/contatti-regole'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Il registro di quello che hanno fatto i contatti dell'azienda: serve alla
// pagina «Contatti» per costruire le liste («chi ha prenotato quella serata»)
// e la storia nella scheda.
//
// Stesso recinto dell'elenco contatti: ognuno la propria azienda; il
// super_admin quella che indica. Dentro non ci sono dati di persone — titoli e
// numeri — ma il recinto resta: dice comunque chi sono i clienti di chi.
export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })
    if (!staffPuoLeggereContatti(profile)) return Response.json({ error: 'Permesso negato per questa sezione', code: 'permission_denied' }, { status: 403 })

    let aziendaId = null
    if (profile.role !== 'super_admin') {
      if (!UUID_RE.test(profile.azienda_id || '')) return Response.json([])
      aziendaId = profile.azienda_id
    } else {
      const chiesta = new URL(request.url).searchParams.get('azienda_id')
      // Senza un'azienda indicata non si restituisce il registro di tutte: la
      // pagina lavora su un'azienda alla volta.
      if (!UUID_RE.test(chiesta || '')) return Response.json([])
      aziendaId = chiesta
    }

    // A pagine: PostgREST ne restituisce mille per volta, e una storia troncata
    // farebbe sparire persone dalle liste senza nessun errore.
    const righe = []
    for (let da = 0; ; da += 1000) {
      const { data, error } = await supabaseAdmin.from('contatti_attivita')
        .select('contatto_id, tipo, titolo, origine_id, riferimento, dettaglio, avvenuta_il')
        .eq('azienda_id', aziendaId).order('avvenuta_il', { ascending: false }).order('id').range(da, da + 999)
      if (error) return Response.json({ error: error.message }, { status: 500 })
      righe.push(...(data || []))
      if (!data || data.length < 1000) break
    }
    return Response.json(righe)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
