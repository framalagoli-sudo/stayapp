import { requireSuperAdmin } from '@/lib/server-auth'
import { giroResoconti, prossimiInvii } from '@/lib/resoconti'

// «Chi lo riceverebbe»: il giro dei resoconti simulato al prossimo lunedì e al
// prossimo 1° del mese, senza scrivere e senza mandare niente. Escono nomi di
// aziende e numero di persone, mai indirizzi. Solo per il proprietario.
// `azienda_id` (facoltativo) limita a un'azienda: lo usano le sonde.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request) {
  try {
    const { response } = await requireSuperAdmin(request)
    if (response) return response
    const id = new URL(request.url).searchParams.get('azienda_id')
    if (id && !UUID.test(id)) return Response.json({ error: 'Azienda non valida' }, { status: 400 })
    const quando = prossimiInvii()
    const out = {}
    for (const tipo of ['settimanale', 'mensile']) {
      const r = await giroResoconti(quando[tipo].istante, { simula: true, soloAzienda: id || null })
      out[tipo] = { giorno: quando[tipo].giorno, elenco: r.elenco.filter(e => e.tipo === tipo) }
    }
    return Response.json(out)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
