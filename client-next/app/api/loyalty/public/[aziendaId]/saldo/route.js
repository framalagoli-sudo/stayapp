import { supabaseAdmin } from '@/lib/supabase-server'
import { rateLimit, tooManyRequests, getClientIp } from '@/lib/rate-limit'

// Informazioni del programma fedeltà, non del singolo cliente.
//
// Prima bastava un'email per sapere quanti punti avesse quella persona: chi
// conosceva l'indirizzo di qualcuno scopriva che è cliente di quel negozio e
// quanto ci spende. Il saldo è un dato personale e non si consegna a chi
// digita un'email altrui — servirebbe la prova di possederla (link o codice
// via email), flusso che oggi non esiste.
//
// Resta pubblico solo ciò che è materiale di vetrina: come funziona il
// programma. Quando il modulo verrà attivato su un cliente vero, il saldo
// personale va servito dietro identificazione.
export async function GET(request, props) {
  const params = await props.params;
  try {
    const ip = getClientIp(request)
    const rl = await rateLimit(request, { name: 'loyalty-saldo', limit: 20, windowSec: 600, ip })
    if (!rl.allowed) return tooManyRequests()

    const { data: prog } = await supabaseAdmin.from('loyalty_programs')
      .select('nome, valore_punto, soglia_riscatto')
      .eq('azienda_id', params.aziendaId).eq('attivo', true).maybeSingle()

    // Stessa risposta per chiunque: non rivela se un'email sia o meno cliente.
    return Response.json({ saldo: 0, saldo_euro: 0, programma: prog || null })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
