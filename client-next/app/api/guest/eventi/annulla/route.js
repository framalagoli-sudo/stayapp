import { leggiAnnullamento, annullaDaOspite } from '@/lib/evento-annullamento'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'

// «Non posso più venire»: pubblica di proposito. Il permesso è il link segreto
// nella conferma (`annulla_token`, un UUID che non si indovina); il tetto ferma
// chi prova a indovinarlo. Aprire il link mostra cosa si sta per annullare,
// ad annullare è il pulsante: i programmi di posta aprono i link da soli.
export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const rl = await rateLimit(request, { name: 'evento-annulla-leggi', limit: 60, windowSec: 3600 })
    if (!rl.allowed) return tooManyRequests()
    const token = new URL(request.url).searchParams.get('t')
    return Response.json(await leggiAnnullamento(token))
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const rl = await rateLimit(request, { name: 'evento-annulla', limit: 20, windowSec: 3600 })
    if (!rl.allowed) return tooManyRequests()
    const { t } = await request.json().catch(() => ({}))
    const esito = await annullaDaOspite(t)
    if (esito.errore) return Response.json({ error: esito.errore }, { status: esito.status })
    return Response.json(esito)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
