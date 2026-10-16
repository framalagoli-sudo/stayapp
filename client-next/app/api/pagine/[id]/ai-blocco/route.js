import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-server'
import { requireEntityRecordAccess } from '@/lib/server-auth'
import { chiamaAI, statoBudget, eBudgetEsaurito, rispostaBudgetEsaurito } from '@/lib/ai-consumi'
import { resolveBlockImages } from '@/lib/unsplash'
import { entityDataSummary } from '@/lib/ai-entity-context'
import { PREFISSO } from '@/lib/entita'
import { promptBlocco, leggiRisposta, ripulisci, tipiPerAI, RICHIESTA_MIN, RICHIESTA_MAX } from '@/lib/ai-blocco'

export const maxDuration = 60

// «Chiedi all'AI» nell'editor di una pagina: dalla descrizione di una sezione
// restituisce uno o più blocchi pronti. NON scrive nella pagina: i blocchi
// tornano all'editor, che li mostra come ogni altra modifica non salvata
// (si annullano, e sul sito vanno solo con «Salva»).
export async function POST(request, props) {
  const params = await props.params
  try {
    const { record: pagina, profile, response } = await requireEntityRecordAccess(request, 'pagine', params.id)
    if (response) return response

    const body = await request.json().catch(() => ({}))
    const richiesta = typeof body.richiesta === 'string' ? body.richiesta.trim().slice(0, RICHIESTA_MAX) : ''
    if (richiesta.length < RICHIESTA_MIN) return Response.json({ error: 'Scrivi che sezione ti serve.' }, { status: 400 })
    // Le sezioni vicine servono solo a dare un contesto: nomi di tipo da un elenco chiuso.
    const tipi = tipiPerAI(pagina.entity_tipo)
    const vicino = v => typeof v === 'string' && tipi.includes(v) ? v : ''

    const { data: ent } = await supabaseAdmin.from('entita')
      .select('name, settore, slug, description, address, phone, email, schedule, checkin_time, checkout_time, amenities, services, activities, excursions, menu, minisito, gallery')
      .eq('id', pagina.entity_id).maybeSingle()
    if (!ent) return Response.json({ error: 'Attività non trovata' }, { status: 404 })

    // Dove può portare un pulsante: le pagine pubblicate di questo sito, e basta.
    const base = `/${PREFISSO[pagina.entity_tipo]}/${ent.slug}`
    const { data: pagine } = await supabaseAdmin.from('pagine').select('titolo, slug')
      .eq('entity_tipo', pagina.entity_tipo).eq('entity_id', pagina.entity_id).eq('status', 'pubblicata').limit(40)
    const destinazioni = [{ url: base, label: 'Home' }, ...(pagine || []).filter(p => p.slug !== '__home__' && /^[a-z0-9-]{1,80}$/.test(p.slug))
      .map(p => ({ url: `${base}/p/${p.slug}`, label: String(p.titolo || p.slug).slice(0, 60) }))]

    const contesto = entityDataSummary(ent, pagina.entity_tipo)
    const azienda_id = profile.azienda_id || null
    const raw = await chiamaAI({
      azienda_id, funzione: 'pagina/ai-blocco', maxTokens: 3000, timeoutMs: 50_000,
      prompt: promptBlocco({
        entity: ent, entity_tipo: pagina.entity_tipo, contesto, richiesta, destinazioni,
        sopra: vicino(body.sopra), sotto: vicino(body.sotto),
        haRecapiti: ['address', 'phone', 'email', 'schedule'].some(k => typeof ent[k] === 'string' && ent[k].trim()),
        fotoInGalleria: Array.isArray(ent.gallery) ? ent.gallery.length : 0,
      }),
    })

    const risposta = leggiRisposta(raw)
    if (!risposta) return Response.json({ error: 'Non sono riuscito a preparare la sezione. Riprova, magari con altre parole.' }, { status: 502 })
    const { blocks, note } = ripulisci(risposta.blocks, {
      entity_tipo: pagina.entity_tipo, richiesta,
      contesto: `${ent.name || ''}\n${ent.description || ''}\n${contesto}`,
      destinazioni: destinazioni.map(d => d.url), nuovoId: randomUUID,
    })
    if (!blocks.length) {
      const motivo = typeof risposta.motivo === 'string' ? risposta.motivo.replace(/<[^>]*>/g, '').trim().slice(0, 240) : ''
      return Response.json({ error: motivo || 'Non ho capito che sezione ti serve: prova a descriverla, per esempio «le domande frequenti sulle prenotazioni».' }, { status: 422 })
    }

    // Le foto d'atmosfera si cercano dalle parole scelte dall'AI; le parole poi non servono più.
    const conFoto = (await resolveBlockImages(blocks, [])).map(b => { const { image_query, ...data } = b.data; return { ...b, data } })
    // La sezione è già pagata: non la si butta via se non si riesce a rileggere il credito.
    const percentuale = await statoBudget(azienda_id).then(s => s.percentuale, () => null)
    return Response.json({ blocks: conFoto, note, usage: { percentuale } })
  } catch (e) {
    if (eBudgetEsaurito(e)) return rispostaBudgetEsaurito()
    console.error('[ai-blocco]', e?.message)
    return Response.json({ error: /abort/i.test(e?.message || '') ? 'L\'AI ci sta mettendo troppo: riprova fra poco.' : 'Non sono riuscito a preparare la sezione. Riprova fra qualche secondo.' }, { status: 500 })
  }
}
