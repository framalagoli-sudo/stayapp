import { eventiPubblici } from '@/lib/eventi-pubblici'

// Dati live: mai cachare (vedi nota in /api/guest/a/[slug]).
export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Pubblica di proposito: gli eventi pubblicati di un sito. Cosa esce e per chi
// lo decide `eventiPubblici`, la stessa funzione che li stampa nelle pagine.
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const { eventi, errore } = await eventiPubblici({
    entity_tipo: searchParams.get('entity_tipo'),
    entity_id: searchParams.get('entity_id'),
    lang: searchParams.get('lang') === 'en' ? 'en' : 'it',
    passati: searchParams.get('quando') === 'passati',
  })
  if (errore) return Response.json({ error: errore }, { status: 500 })
  return Response.json(eventi)
}
