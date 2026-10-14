import { requireSuperAdmin } from '@/lib/server-auth'
import { chiamaAI } from '@/lib/ai-consumi'
import { SEGNALI, AZIONI_CONSIGLIO, segnapostiIgnoti } from '@/lib/consigli-segnali'

// La regia chiede all'AI titolo e «perché» di un consiglio, partendo dal
// segnale scelto. **Non salva niente**. Paga la piattaforma.
export async function POST(request) {
  try {
    const { response } = await requireSuperAdmin(request)
    if (response) return response
    const body = await request.json().catch(() => ({}))
    const s = SEGNALI[body.segnale]
    if (!s) return Response.json({ error: 'Segnale non valido' }, { status: 400 })
    const nota = String(body.nota || '').trim().slice(0, 800)

    const system = `Sei la voce di OltreNova, piattaforma italiana per piccole attività di servizi. Scrivi un CONSIGLIO che compare nel pannello di un titolare quando succede una cosa precisa nei suoi numeri. Dai del tu, italiano semplice, tono da consulente che vuole bene al cliente.

Regole:
- Il titolo dice cosa sta succedendo, con i numeri, in una frase (massimo 120 caratteri). Puoi usare SOLO questi segnaposti, scritti fra graffe: ${s.segnaposti.map(k => `{${k}}`).join(', ')}.
- Il «perché» spiega in 2-3 frasi perché conta e cosa conviene fare adesso. Niente percentuali o studi inventati, niente promesse di risultati, niente HTML.
- Rispondi SOLO con JSON: {"titolo": "...", "perche": "...", "azione": "<una chiave fra: ${Object.keys(AZIONI_CONSIGLIO).join(', ')}>"}`
    const prompt = `Quando scatta: ${s.nome} — ${s.descrizione}${nota ? `\nIndicazioni di Francesco: ${nota}` : ''}`

    const grezzo = await chiamaAI({ funzione: 'club/consiglio', system, prompt, maxTokens: 600 })
    let r
    try { r = JSON.parse(grezzo.slice(grezzo.indexOf('{'), grezzo.lastIndexOf('}') + 1)) }
    catch { return Response.json({ error: 'L\'AI ha risposto in un formato inatteso: riprova' }, { status: 502 }) }
    const titolo = String(r.titolo || '').trim().slice(0, 200)
    const perche = String(r.perche || '').trim().slice(0, 2000)
    // Un segnaposto inventato dall'AI non si compilerebbe: meglio dirlo subito.
    const ignoti = [...segnapostiIgnoti(body.segnale, titolo), ...segnapostiIgnoti(body.segnale, perche)]
    return Response.json({ titolo, perche, azione: AZIONI_CONSIGLIO[r.azione] ? r.azione : null, avviso: ignoti.length ? `L'AI ha usato segnaposti che questo segnale non conosce (${ignoti.join(', ')}): correggili prima di salvare.` : null })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
