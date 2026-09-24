import { requireSuperAdmin } from '@/lib/server-auth'
import { logError } from '@/lib/observability'
import { applicaProfilo } from '@/lib/applica-profilo'

// Assegna la categoria (profilo di mestiere) a un'entità, o la toglie.
// Solo super_admin: le funzioni le decidiamo noi (STRATEGIA.md §6.1).
// Body: { profilo: "<chiave>" } oppure { profilo: null }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request, props) {
  const { id } = await props.params
  try {
    const { response } = await requireSuperAdmin(request)
    if (response) return response
    if (!UUID.test(id)) return Response.json({ error: 'Non trovata' }, { status: 404 })
    const body = await request.json().catch(() => null)
    const chiave = body?.profilo ?? null
    if (chiave !== null && (typeof chiave !== 'string' || !/^[a-z0-9_]{2,40}$/.test(chiave))) {
      return Response.json({ error: 'Categoria non valida' }, { status: 400 })
    }
    const esito = await applicaProfilo(id, chiave)
    if (esito.errore) return Response.json({ error: esito.errore }, { status: esito.status })
    return Response.json(esito)
  } catch (err) {
    logError('applica-profilo', err)
    return Response.json({ error: 'Errore interno' }, { status: 500 })
  }
}
