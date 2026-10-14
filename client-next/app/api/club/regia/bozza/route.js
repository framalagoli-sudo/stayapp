import { requireSuperAdmin } from '@/lib/server-auth'
import { chiamaAI } from '@/lib/ai-consumi'
import { TIPI, AZIONI } from '@/lib/club-regole'

// La regia chiede all'AI la bozza di un contenuto del Club partendo da un'idea
// in due righe. **Non salva niente**: restituisce titolo, testo e pulsante
// proposti, che Francesco legge, corregge e solo dopo salva.
//
// Paga la piattaforma (il super_admin non ha azienda): pochi millesimi a bozza.
const SYSTEM = `Sei la voce di OltreNova, una piattaforma italiana per piccole attività di servizi (locali, ristoranti, strutture ricettive, professionisti, negozi). Scrivi come un consulente di marketing esperto che parla a un titolare indaffarato: frasi brevi, concrete, in italiano semplice, dando del tu. Ogni contenuto deve finire con cose da FARE, non con teoria.

Regole:
- Non inventare dati, percentuali, statistiche, studi o casi di clienti: se non lo sai, non lo scrivi.
- Niente promesse di risultati («raddoppierai le vendite»).
- Al massimo 3-4 paragrafi brevi, separati da una riga vuota. Se servono passi, scrivili come righe che iniziano con un numero e un punto.
- Puoi usare <b>...</b> per una o due parole chiave. Nessun altro HTML.

Rispondi SOLO con un oggetto JSON: {"titolo": "...", "testo": "...", "azione": "<una chiave fra: ${Object.keys(AZIONI).join(', ')}, oppure null>"}`

export async function POST(request) {
  try {
    const { response } = await requireSuperAdmin(request)
    if (response) return response
    const body = await request.json().catch(() => ({}))
    const tipo = TIPI[body.tipo] ? body.tipo : 'strategia'
    const idea = String(body.idea || '').trim().slice(0, 1500)
    if (!idea) return Response.json({ error: 'Scrivi l\'idea in due righe' }, { status: 400 })
    const perChi = Array.isArray(body.mestieri) && body.mestieri.length
      ? body.mestieri.map(String).slice(0, 10).map(s => s.slice(0, 60)).join(', ')
      : 'tutte le attività'
    const quando = /^\d{4}-\d{2}-\d{2}$/.test(body.data_occasione || '') ? `\nGiorno dell'occasione: ${body.data_occasione}.` : ''

    const prompt = `Tipo di contenuto: ${TIPI[tipo].nome} — ${TIPI[tipo].descrizione}
Per chi: ${perChi}.${quando}
L'idea di Francesco, da sviluppare:
${idea}`
    const grezzo = await chiamaAI({ funzione: 'club/bozza', system: SYSTEM, prompt, maxTokens: 1200 })
    const json = grezzo.slice(grezzo.indexOf('{'), grezzo.lastIndexOf('}') + 1)
    let r
    try { r = JSON.parse(json) } catch { return Response.json({ error: 'L\'AI ha risposto in un formato inatteso: riprova' }, { status: 502 }) }

    // Si ricostruisce campo per campo: quello che non è previsto non passa.
    return Response.json({
      titolo: String(r.titolo || '').trim().slice(0, 160),
      testo: String(r.testo || '').trim().slice(0, 12000),
      azione: AZIONI[r.azione] ? r.azione : null,
    })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
