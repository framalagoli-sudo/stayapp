import { supabaseAdmin } from '@/lib/supabase-server'
import { requireEntityAccess } from '@/lib/server-auth'
import { entityDataSummary } from '@/lib/ai-entity-context'
import { chiamaAI, eBudgetEsaurito, rispostaBudgetEsaurito } from '@/lib/ai-consumi'
import { taglia } from '@/lib/seo-testo'

// Il titolo e la descrizione che si leggono nei risultati di ricerca, proposti
// dall'AI a partire da quello che il cliente ha già scritto.
//
// ⛔ Misurato il 18/09/2026: quattro siti veri su nove non li avevano. Non è
// pigrizia dei clienti — è che nessuno sa cosa scrivere in quelle due righe, e
// intanto Google se le inventa pescando dalla pagina, spesso il menu.
//
// ⚠️ **Propone, non salva.** Le parole con cui un'attività si presenta sono
// sue: la riga la scrive l'AI, la decisione resta al cliente, che la vede
// prima di tenerla.

export const maxDuration = 30

const LIMITI = { titolo: 60, descrizione: 155 }

export async function POST(request, props) {
  const params = await props.params
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    if (!['struttura', 'ristorante', 'attivita'].includes(tipo)) {
      return Response.json({ error: 'Tipo non valido' }, { status: 400 })
    }
    const { response } = await requireEntityAccess(request, tipo, params.id)
    if (response) return response

    // Colonne elencate: questa risposta passa dal browser del cliente, e
    // `entita` contiene anche la password del WiFi.
    const { data: ent } = await supabaseAdmin.from('entita')
      .select('id, name, description, address, settore, tipo, azienda_id, minisito, services, activities, excursions, amenities')
      .eq('id', params.id).maybeSingle()
    if (!ent) return Response.json({ error: 'Non trovato' }, { status: 404 })

    // Anche la home: è la pagina che descrive davvero l'attività, e spesso
    // dice meglio dei campi anagrafici cosa fa questo cliente.
    const { data: home } = await supabaseAdmin.from('pagine')
      .select('blocks').eq('entity_tipo', tipo).eq('entity_id', ent.id)
      .eq('slug', '__home__').maybeSingle()

    const testoHome = (Array.isArray(home?.blocks) ? home.blocks : [])
      .flatMap(b => [b?.data?.title, b?.data?.titolo, b?.data?.tagline, b?.data?.text, b?.data?.sottotitolo])
      .filter(t => typeof t === 'string' && t.trim())
      .join(' · ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 1200)

    // `entityDataSummary` è la stessa whitelist che usa l'AI Site Builder:
    // niente wifi, niente dati del titolare.
    const contesto = entityDataSummary(ent, tipo)

    const testo = await chiamaAI({
      azienda_id: ent.azienda_id,
      funzione: 'seo/titolo-descrizione',
      maxTokens: 300,
      system: 'Scrivi il titolo e la meta description di un sito, in italiano. '
        + `Il titolo: massimo ${LIMITI.titolo} caratteri, dice CHI è e COSA fa, e include la città se la sai. `
        + `La descrizione: massimo ${LIMITI.descrizione} caratteri, una frase piana che dica cosa si trova qui e perché scriverci o venire. `
        + 'Niente superlativi da brochure («eccellenza», «unico nel suo genere»), niente punti esclamativi, niente virgolette. '
        + 'Usa solo quello che ti viene detto: se un dato non c\'è, non inventarlo. '
        + 'Rispondi SOLO con un oggetto JSON: {"titolo": "...", "descrizione": "..."}',
      prompt: `Dati dell'attività:\n${JSON.stringify(contesto)}\n\nTesti della home:\n${testoHome || '(nessuno)'}`,
    })

    // ⚠️ L'AI a volte incornicia il JSON con del testo: si prende il primo
    // oggetto e basta, invece di fidarsi della forma della risposta.
    const grezzo = testo.match(/\{[\s\S]*\}/)?.[0]
    let proposta = null
    try { proposta = grezzo ? JSON.parse(grezzo) : null } catch { proposta = null }
    if (!proposta?.titolo && !proposta?.descrizione) {
      return Response.json({ error: 'Non sono riuscito a scrivere una proposta. Riprova.' }, { status: 502 })
    }

    return Response.json({
      titolo: taglia(proposta.titolo || '', LIMITI.titolo),
      descrizione: taglia(proposta.descrizione || '', LIMITI.descrizione),
    })
  } catch (e) {
    if (eBudgetEsaurito(e)) return rispostaBudgetEsaurito()
    return Response.json({ error: e.message }, { status: 500 })
  }
}
