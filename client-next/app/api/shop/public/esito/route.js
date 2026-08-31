import { supabaseAdmin } from '@/lib/supabase-server'

// Cosa dire a chi ha appena pagato.
//
// ⚠️ Route **pubblica**: risponde a chi non ha fatto login, perché chi ha
// comprato non ha un account da noi. Per questo restituisce il minimo
// indispensabile — numero, totale, stato — e **niente** di ciò che identifica
// la persona: né email, né telefono, né indirizzo di spedizione.
//
// La chiave d'accesso è l'id della sessione di pagamento: una stringa lunga e
// casuale che conosce solo chi è appena tornato da Stripe. Non è un segreto
// forte, ed è la ragione per cui qui non esce niente che valga la pena rubare.

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const sid = (searchParams.get('session_id') || '').trim()
    // Forma attesa di una sessione Stripe: senza questo, un parametro qualsiasi
    // finirebbe comunque in una query.
    if (!/^cs_[A-Za-z0-9_]{10,200}$/.test(sid))
      return Response.json({ error: 'riferimento non valido' }, { status: 400 })

    const { data } = await supabaseAdmin.from('ordini')
      .select('numero, totale, stato, pagamento_stato')
      .eq('stripe_session_id', sid).maybeSingle()

    if (!data) return Response.json({ trovato: false })

    return Response.json({
      trovato: true,
      numero: data.numero,
      totale: data.totale,
      // ⚠️ Il pagamento può risultare ancora in corso: il webhook di Stripe
      // arriva in un istante diverso dal ritorno del browser, e con alcuni
      // metodi ci mette giorni. Dirlo è meglio che mostrare «non pagato» a chi
      // ha appena pagato davvero.
      pagato: data.pagamento_stato === 'pagato' || data.stato === 'pagato',
    })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
