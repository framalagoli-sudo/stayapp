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

    // ⚠️ I testi stanno anche dentro le diapositive e gli elenchi, non solo in
    // `data.title`: prendendo solo quelli la proposta usciva generica —
    // «Attività commerciale in Via Galvani 14» per uno studio di investimenti
    // immobiliari che sulla home racconta tutt'altro.
    const testiDi = d => [d?.title, d?.titolo, d?.tagline, d?.subtitle, d?.sottotitolo, d?.text]
      .concat((Array.isArray(d?.slides) ? d.slides : []).flatMap(x => [x?.title, x?.subtitle]))
      .concat((Array.isArray(d?.items) ? d.items : []).flatMap(x => [x?.title, x?.text]))

    const testoHome = (Array.isArray(home?.blocks) ? home.blocks : [])
      .flatMap(b => testiDi(b?.data))
      .filter(t => typeof t === 'string' && t.trim())
      .join(' · ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 1500)

    // Le pagine dicono di cosa si occupa: «Il Nostro Metodo», «Investire con Noi».
    const { data: pagine } = await supabaseAdmin.from('pagine')
      .select('titolo').eq('entity_tipo', tipo).eq('entity_id', ent.id)
      .eq('status', 'pubblicata').neq('slug', '__home__').limit(12)

    // ⚠️ `entityDataSummary` è un **supplemento** (servizi, orari, dotazioni):
    // non contiene nome, settore e descrizione, che sono la sostanza. È la
    // stessa whitelist dell'AI Site Builder — niente wifi, niente dati del
    // titolare — e va integrata, non usata da sola.
    const contesto = [
      `Nome: ${ent.name || ''}`,
      ent.settore ? `Settore: ${ent.settore}` : '',
      ent.description ? `Come si descrive: ${String(ent.description).slice(0, 300)}` : '',
      ent.minisito?.tagline ? `Slogan: ${String(ent.minisito.tagline).slice(0, 120)}` : '',
      ent.address ? `Dove: ${String(ent.address).slice(0, 120)}` : '',
      (pagine || []).length ? `Pagine del sito: ${pagine.map(p => p.titolo).filter(Boolean).join(', ')}` : '',
      entityDataSummary(ent, tipo),
    ].filter(Boolean).join('\n')

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
