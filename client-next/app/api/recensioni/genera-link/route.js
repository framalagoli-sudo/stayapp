import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, entitaDellaAzienda, getEntityAziendaId } from '@/lib/server-auth'

export async function POST(request) {
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

    const { entity_tipo, entity_id, autore } = await request.json()
    if (!entity_tipo || !entity_id) return Response.json({ error: 'entity_tipo e entity_id obbligatori' }, { status: 400 })

    // 🔒 Qui NON si verificava niente: bastava un account qualsiasi per generare
    // un link di recensione sulla scheda di un'ALTRA azienda, e la recensione
    // sarebbe poi comparsa sul suo sito. Stessa classe del buco sugli eventi
    // (26/08): l'entita' arriva dal corpo della richiesta, quindi si controlla.
    if (!(await entitaDellaAzienda(profile, entity_tipo, entity_id))) {
      return Response.json({ error: 'Entità non valida' }, { status: 404 })
    }
    const aziendaId = await getEntityAziendaId(entity_tipo, entity_id)
    if (!aziendaId) return Response.json({ error: 'Entità non valida' }, { status: 404 })

    const { data, error } = await supabaseAdmin.from('recensioni').insert({
      azienda_id: aziendaId, entity_tipo, entity_id,
      autore: autore?.trim() || '', stelle: 5, testo: '', fonte: 'form',
      verificata: false, pubblica: false,
    }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })

    const link = `${(process.env.CLIENT_URL ?? '').trim() || 'https://oltrenova.com'}/recensione?token=${data.token}`
    return Response.json({ token: data.token, link }, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
