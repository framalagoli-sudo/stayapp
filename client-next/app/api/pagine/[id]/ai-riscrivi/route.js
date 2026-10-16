import { supabaseAdmin } from '@/lib/supabase-server'
import { requireEntityRecordAccess } from '@/lib/server-auth'
import { chiamaAI, statoBudget, eBudgetEsaurito, rispostaBudgetEsaurito } from '@/lib/ai-consumi'
import { promptRiscrivi, leggiRisposta, testiDaRiscrivere, conTestiRiscritti, tipiPerAI, ISTRUZIONE_MIN, ISTRUZIONE_MAX, TESTI_MAX } from '@/lib/ai-blocco'

export const maxDuration = 60

// «Riscrivi i testi con l'AI» su una sezione che c'è già: riceve i testi come
// sono nell'editor (anche non salvati) e restituisce SOLO quelli cambiati.
// NON scrive nella pagina: li mette l'editor, come ogni altra modifica.
export async function POST(request, props) {
  const params = await props.params
  try {
    const { record: pagina, profile, response } = await requireEntityRecordAccess(request, 'pagine', params.id)
    if (response) return response

    const body = await request.json().catch(() => ({}))
    const istruzione = typeof body.istruzione === 'string' ? body.istruzione.trim().slice(0, ISTRUZIONE_MAX) : ''
    if (istruzione.length < ISTRUZIONE_MIN) return Response.json({ error: 'Scrivi come vuoi che cambi il testo.' }, { status: 400 })
    const type = typeof body.type === 'string' && tipiPerAI(pagina.entity_tipo).includes(body.type) ? body.type : null
    const testi = type ? testiDaRiscrivere(type, body.data) : null
    if (!testi) return Response.json({ error: 'In questa sezione non ci sono testi che posso riscrivere.' }, { status: 400 })
    if (JSON.stringify(testi).length > TESTI_MAX) return Response.json({ error: 'Questa sezione è troppo lunga per riscriverla in un colpo solo.' }, { status: 400 })

    const { data: ent } = await supabaseAdmin.from('entita').select('name, settore, description').eq('id', pagina.entity_id).maybeSingle()
    if (!ent) return Response.json({ error: 'Attività non trovata' }, { status: 404 })

    const azienda_id = profile.azienda_id || null
    const raw = await chiamaAI({
      azienda_id, funzione: 'pagina/ai-riscrivi', maxTokens: 4000, timeoutMs: 50_000,
      prompt: promptRiscrivi({ entity: ent, type, testi, istruzione }),
    })

    const risposta = leggiRisposta(raw)
    if (!risposta) return Response.json({ error: 'Non sono riuscito a riscrivere. Riprova, magari con altre parole.' }, { status: 502 })
    const esito = conTestiRiscritti(type, body.data, risposta, `${istruzione}\n${ent.name || ''}\n${ent.description || ''}`)
    if (!esito?.cambiati) {
      const motivo = typeof risposta.motivo === 'string' ? risposta.motivo.replace(/<[^>]*>/g, '').trim().slice(0, 240) : ''
      return Response.json({ error: motivo || esito?.note[0] || 'Non ho cambiato niente: prova a dirmi cosa vuoi diverso, per esempio «più corto» o «più caldo».' }, { status: 422 })
    }
    // La riscrittura è già pagata: non la si butta via se non si riesce a rileggere il credito.
    const percentuale = await statoBudget(azienda_id).then(s => s.percentuale, () => null)
    return Response.json({ testi: esito.testi, cambiati: esito.cambiati, note: esito.note, usage: { percentuale } })
  } catch (e) {
    if (eBudgetEsaurito(e)) return rispostaBudgetEsaurito()
    console.error('[ai-riscrivi]', e?.message)
    return Response.json({ error: /abort/i.test(e?.message || '') ? 'L\'AI ci sta mettendo troppo: riprova fra poco.' : 'Non sono riuscito a riscrivere. Riprova fra qualche secondo.' }, { status: 500 })
  }
}
