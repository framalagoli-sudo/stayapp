import { requireEntityAccess } from '@/lib/server-auth'
import { creaTokenAnteprima } from '@/lib/preview-token'

// Rilascia all'editor il permesso di aprire le proprie bozze in anteprima.
// Solo chi ha accesso all'entità lo ottiene, e vale solo per quell'entità.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    const entityId = searchParams.get('entityId')
    if (!['struttura', 'ristorante', 'attivita'].includes(tipo) || !entityId) {
      return Response.json({ error: 'Parametri non validi' }, { status: 400 })
    }
    const { response } = await requireEntityAccess(request, tipo, entityId)
    if (response) return response
    return Response.json({ token: creaTokenAnteprima(tipo, entityId) })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
