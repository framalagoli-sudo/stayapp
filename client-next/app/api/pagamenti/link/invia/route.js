import { prenotazioneDiChiChiede } from '@/lib/link-pagamento-accesso'
import { mandaLinkPagamento } from '@/lib/link-pagamento'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { logError } from '@/lib/observability'

const EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/

// Manda per email il link di pagamento già creato, all'indirizzo che il
// titolare scrive nel pannello. L'accesso — `requireAuth` e «è della sua
// azienda?» — sta in `prenotazioneDiChiChiede`. Il limite serve perché da qui
// parte posta a nome del cliente verso un indirizzo scelto a mano.
export async function POST(request) {
  try {
    const rl = await rateLimit(request, { name: 'link-pagamento-invia', limit: 30, windowSec: 3600 })
    if (!rl.allowed) return tooManyRequests()
    const body = await request.json().catch(() => ({}))
    const { pren, response } = await prenotazioneDiChiChiede(request, body.tipo, body.id)
    if (response) return response
    const email = String(body.email || '').trim().toLowerCase()
    if (!EMAIL.test(email) || email.length > 200) return Response.json({ error: 'Scrivi un indirizzo email valido.' }, { status: 400 })
    const esito = await mandaLinkPagamento(pren, email)
    if (esito.errore) return Response.json({ error: esito.errore }, { status: esito.status })
    return Response.json({ ok: true })
  } catch (e) { await logError('pagamenti/link/invia', e, { alert: true }); return Response.json({ error: 'Non siamo riusciti a inviare l’email. Riprova.' }, { status: 500 }) }
}
