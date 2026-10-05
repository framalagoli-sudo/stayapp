import { disiscrivi } from '@/lib/disiscrizione'

// Pubblica di proposito: chi si disiscrive non ha un account. Il permesso è il
// codice personale nell'indirizzo (un UUID casuale, uno per contatto).
// Risponde solo «fatto» o «non valido»: mai chi sia la persona.

// Il link in fondo all'email, aperto dalla pagina /unsubscribe.
export async function GET(request) {
  return rispondi(request, 'link')
}

// Il pulsante «Annulla iscrizione» del programma di posta (RFC 8058).
export async function POST(request) {
  return rispondi(request, 'pulsante')
}

async function rispondi(request, fonte) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    // «TEST» è il codice delle email di prova: non c'è nessuno da togliere.
    if (!token || token === 'TEST') return Response.json({ ok: true, test: true })
    const esito = await disiscrivi(token, { newsletterId: searchParams.get('nl'), fonte })
    if (!esito.ok) return Response.json({ error: 'Token non valido' }, { status: 404 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: 'Non siamo riusciti a completare la richiesta. Riprova fra poco.' }, { status: 500 }) }
}
