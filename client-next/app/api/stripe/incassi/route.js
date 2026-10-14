import { righeIncassi } from '@/lib/incassi'
import { requireAuth, getProfile, resolveAziendaId } from '@/lib/server-auth'

// Gli incassi di questa azienda: cosa è stato pagato online, quando e quanto.
//
// ⛔ Perché esiste (22/09/2026). Garage 22 riceve il primo pagamento vero, di
// Agnese. Nel database è tutto giusto — webhook arrivato, riga segnata pagata.
// Francesco apre **Pagamenti** e non trova niente, perché quella pagina è solo
// il collegamento del conto: «collega», «stato», «riprendi». Non ha mai
// elencato un incasso, e quindi il titolare non aveva **nessun** posto in cui
// vedere i soldi entrati.
//
// Le righe le legge `lib/incassi.js` dalle nostre tabelle, senza chiedere
// niente a Stripe: ricevute, rimborsi e saldo stanno sulla dashboard di Stripe,
// dove il cliente entra col suo account.
//
// 🔒 Si risponde solo per la propria azienda: `resolveAziendaId` non lascia che
// un `azienda_id` arrivato nella richiesta scavalchi quello del profilo.

export const dynamic = 'force-dynamic'

const LIMITE = 100

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    const { searchParams } = new URL(request.url)
    const azienda_id = resolveAziendaId(profile, searchParams.get('azienda_id'))
    if (!azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })

    const righe = await righeIncassi(azienda_id, { limite: LIMITE })
    return Response.json({
      righe: righe.slice(0, LIMITE),
      totale: righe.reduce((n, r) => n + r.importo, 0),
      // Lo dice la lista stessa: se è troncata, chi guarda deve saperlo invece
      // di credere che siano tutti.
      troncata: righe.length > LIMITE,
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
