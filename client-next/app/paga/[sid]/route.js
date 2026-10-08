import { destinazioneLink } from '@/lib/link-pagamento'
import { FORMA_SESSIONE } from '@/lib/esito-pagamento'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// Il link di pagamento che il titolare manda a chi ha prenotato.
//
// Pubblico di proposito: chi lo apre non ha un account. La chiave è l'id della
// sessione di Stripe, lungo e casuale; e da qui non esce nessun dato — solo un
// rimando alla cassa, o una pagina che dice che il link non vale più.

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function pagina(titolo, testo, status = 200) {
  return new Response(`<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(titolo)}</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f5f5;font-family:system-ui,-apple-system,sans-serif;color:#1a1a2e">
<div style="background:#fff;border-radius:16px;padding:40px 28px;max-width:420px;width:calc(100% - 32px);box-sizing:border-box;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.06)">
<h1 style="font-size:22px;margin:0 0 12px;line-height:1.3">${esc(titolo)}</h1>
<p style="font-size:15px;line-height:1.6;color:#555;margin:0">${testo}</p>
</div></body></html>`, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
}

export async function GET(request, props) {
  const { sid } = await props.params
  try {
    const rl = await rateLimit(request, { name: 'paga-link', limit: 60, windowSec: 3600 })
    if (!rl.allowed) return tooManyRequests()
    if (!FORMA_SESSIONE.test(String(sid || ''))) return pagina('Link non valido', 'Questo indirizzo non corrisponde a nessun pagamento.', 404)
    const d = await destinazioneLink(sid)
    if (d.stato === 'aperto') return Response.redirect(d.url, 303)
    if (d.stato === 'pagato') return Response.redirect(new URL(`/checkout/successo?session_id=${sid}`, request.url), 303)
    if (d.stato === 'scaduto') return pagina('Il link è scaduto', `Questo link di pagamento non è più valido. Scrivi a <strong>${esc(d.nome)}</strong> per riceverne uno nuovo.`, 410)
    return pagina('Link non valido', 'Questo indirizzo non corrisponde a nessun pagamento.', 404)
  } catch {
    return pagina('Un momento', 'Non siamo riusciti ad aprire il pagamento. Riprova fra poco.', 503)
  }
}
