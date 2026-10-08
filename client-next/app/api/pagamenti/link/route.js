import { prenotazioneDiChiChiede } from '@/lib/link-pagamento-accesso'
import { creaLinkPagamento, linkAttivo, motivoNonSiPuo, ORE_LINK } from '@/lib/link-pagamento'
import { puoIncassare } from '@/lib/checkout'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { logError } from '@/lib/observability'
import { normalizzaTelefono } from '@/lib/contatti-import'

// Il link di pagamento per una prenotazione (evento o risorsa), chiesto dal
// titolare. Regole e motivi in `lib/link-pagamento.js`. L'accesso —
// `requireAuth` e «è della sua azienda?» — sta in `prenotazioneDiChiChiede`.

// Com'è messa questa prenotazione: si può chiedere un pagamento? quanto
// proporre? c'è già un link valido?
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const { pren, response } = await prenotazioneDiChiChiede(request, searchParams.get('tipo'), searchParams.get('id'))
    if (response) return response
    return Response.json({
      titolo: pren.titolo, quando: pren.quando, nome: pren.nome, email: pren.email, telefono: pren.telefono,
      // Il numero in forma internazionale, per aprire WhatsApp: null se non è
      // utilizzabile, invece di inventarsi un prefisso.
      whatsapp: normalizzaTelefono(pren.telefono)?.slice(1) || null,
      totale: pren.totale, proposta: pren.proposta, ore: ORE_LINK,
      conto_collegato: await puoIncassare(pren.aziendaId),
      non_si_puo: motivoNonSiPuo(pren),
      link: linkAttivo(pren),
    })
  } catch (e) { await logError('pagamenti/link', e); return Response.json({ error: 'Non siamo riusciti a leggere la prenotazione. Riprova.' }, { status: 500 }) }
}

// Crea il link. L'importo arriva dal pannello perché lo decide il titolare, ma
// si controlla qui: mai sopra il totale della prenotazione.
export async function POST(request) {
  try {
    const rl = await rateLimit(request, { name: 'link-pagamento', limit: 60, windowSec: 3600 })
    if (!rl.allowed) return tooManyRequests()
    const body = await request.json().catch(() => ({}))
    const { pren, response } = await prenotazioneDiChiChiede(request, body.tipo, body.id)
    if (response) return response
    const base = (process.env.CLIENT_URL ?? '').trim() || new URL(request.url).origin
    const esito = await creaLinkPagamento(pren, body.importo, base)
    if (esito.errore) return Response.json({ error: esito.errore }, { status: esito.status })
    return Response.json({ link: esito.link }, { status: 201 })
  } catch (e) { await logError('pagamenti/link', e, { alert: true }); return Response.json({ error: 'Non siamo riusciti a creare il link. Riprova.' }, { status: 500 }) }
}
