import { supabaseAdmin } from '@/lib/supabase-server'
import { requireEntityAccess } from '@/lib/server-auth'
import { chiamaAI, statoBudget, eBudgetEsaurito, rispostaBudgetEsaurito } from '@/lib/ai-consumi'
import { leggiRisposta, testoPulito } from '@/lib/ai-blocco'
import { riassuntoPagina, promptInterprete, ripulisciMosse, FRASE_MIN, FRASE_MAX, PAGINA_MAX } from '@/lib/interprete'

export const maxDuration = 60

// «Dimmi cosa cambiare» nell'editor delle pagine: riceve la frase e i blocchi
// come sono nell'editor (anche non salvati) e restituisce le MOSSE da fare,
// già ricostruite dal catalogo chiuso di lib/interprete.js.
// NON scrive nella pagina: le applica l'editor, come ogni altra modifica.
export async function POST(request, props) {
  const params = await props.params
  try {
    const { data: pagina } = await supabaseAdmin.from('pagine').select('id, entity_tipo, entity_id').eq('id', params.id).maybeSingle()
    if (!pagina) return Response.json({ error: 'Pagina non trovata' }, { status: 404 })
    const { profile, response } = await requireEntityAccess(request, pagina.entity_tipo, pagina.entity_id)
    if (response) return response

    const body = await request.json().catch(() => ({}))
    const frase = typeof body.frase === 'string' ? testoPulito(body.frase, FRASE_MAX) : ''
    if (frase.length < FRASE_MIN) return Response.json({ error: 'Dimmi cosa vuoi cambiare.' }, { status: 400 })
    if (!Array.isArray(body.blocchi)) return Response.json({ error: 'Manca la pagina.' }, { status: 400 })
    if (JSON.stringify(body.blocchi).length > PAGINA_MAX) return Response.json({ error: 'Questa pagina è troppo lunga per i comandi a parole: usa le schede delle sezioni.' }, { status: 400 })
    const { righe, mappa } = riassuntoPagina(body.blocchi)

    const { data: ent } = await supabaseAdmin.from('entita').select('name').eq('id', pagina.entity_id).maybeSingle()
    if (!ent) return Response.json({ error: 'Attività non trovata' }, { status: 404 })

    const azienda_id = profile.azienda_id || null
    const raw = await chiamaAI({
      azienda_id, funzione: 'pagina/interprete', maxTokens: 1500, timeoutMs: 45_000,
      prompt: promptInterprete({ righe, frase, entity: ent }),
    })
    const risposta = leggiRisposta(raw)
    if (!risposta) return Response.json({ error: 'Non ho capito. Riprova con altre parole.' }, { status: 502 })

    const { mosse, note } = ripulisciMosse(risposta, mappa, frase)
    const spiegazione = testoPulito(risposta.risposta, 300)
    if (!mosse.length) {
      return Response.json({ error: spiegazione || note[0] || 'Non ho capito cosa cambiare. Prova per esempio: «sposta le recensioni sopra i prezzi».' }, { status: 422 })
    }
    // Il comando è già pagato: non lo si butta via se non si riesce a rileggere il credito.
    const percentuale = await statoBudget(azienda_id).then(s => s.percentuale, () => null)
    return Response.json({ mosse, risposta: spiegazione, note, usage: { percentuale } })
  } catch (e) {
    if (eBudgetEsaurito(e)) return rispostaBudgetEsaurito()
    console.error('[ai-comando]', e?.message)
    return Response.json({ error: /abort/i.test(e?.message || '') ? 'L\'AI ci sta mettendo troppo: riprova fra poco.' : 'Non sono riuscito a capire il comando. Riprova fra qualche secondo.' }, { status: 500 })
  }
}
