import { datiEventoPubblico } from '@/lib/evento-pubblico'

// Copre la traduzione Haiku dell'evento al primo caricamento EN (cache miss).
export const maxDuration = 30

// I dati stanno in `lib/evento-pubblico.js`, che usa anche la pagina servita
// dal server: erano scritti qui, e la pagina li chiedeva dal browser — quindi
// nell'HTML non c'era niente da indicizzare.

export async function GET(request, props) {
  const params = await props.params
  try {
    const lang = new URL(request.url).searchParams.get('lang') === 'en' ? 'en' : 'it'
    const dati = await datiEventoPubblico(params.id, lang)
    if (!dati) return Response.json({ error: 'Evento non trovato' }, { status: 404 })
    return Response.json(dati)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
