import { leggiOfferta, prendiPosto, rinunciaOfferta } from '@/lib/lista-attesa-automatica'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'

// Il posto offerto a chi era in lista d'attesa: pubblica di proposito. Il
// permesso è il link segreto dell'email (`offerta_token`); il tetto ferma chi
// prova a indovinarlo. Prendere il posto è un pulsante, non l'apertura del link.
export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const rl = await rateLimit(request, { name: 'evento-posto-leggi', limit: 60, windowSec: 3600 })
    if (!rl.allowed) return tooManyRequests()
    const token = new URL(request.url).searchParams.get('t')
    return Response.json(await leggiOfferta(token))
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const rl = await rateLimit(request, { name: 'evento-posto', limit: 20, windowSec: 3600 })
    if (!rl.allowed) return tooManyRequests()
    const { t, azione } = await request.json().catch(() => ({}))
    const esito = azione === 'rinuncia'
      ? await rinunciaOfferta(t)
      : await prendiPosto(t, new URL(request.url).origin)
    if (esito.errore) return Response.json({ error: esito.errore }, { status: esito.status })
    return Response.json(esito)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
