import { esitoPagamento } from '@/lib/esito-pagamento'

// Cosa dire a chi ha appena pagato — shop, prenotazioni ed eventi insieme.
//
// ⚠️ Route **pubblica di proposito**: chi ha comprato non ha un account da noi.
// Quello che esce e perché è scritto in `lib/esito-pagamento.js`, che è l'unico
// posto dove si cerca: prima c'era `/api/shop/public/esito`, che sapeva leggere
// solo gli ordini del negozio e rispondeva «non trovato» a chi aveva pagato una
// cena o una camera.

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const esito = await esitoPagamento(searchParams.get('session_id'))
    if (esito.motivo) return Response.json({ error: esito.motivo }, { status: 400 })
    return Response.json(esito)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
