import { supabaseAdmin } from '@/lib/supabase-server'
import { requireEntityAccess } from '@/lib/server-auth'

// Quali blocchi ci sono davvero sul sito di questa entità.
//
// Serve a rispondere alla domanda «l'ho configurato, ma si vede?» — che in
// questo pannello si pone in molti punti: le risorse prenotabili senza il
// widget, le offerte senza il blocco offerte, i prodotti senza la vetrina.
// Ogni volta il cliente ha fatto il suo lavoro e non se ne accorge nessuno.
//
// ⚠️ Restituisce **solo i nomi dei tipi di blocco**, non i contenuti: chi
// chiede vuole sapere se una cosa c'è, non cosa c'è scritto dentro. Meno esce,
// meno si può perdere.
//
// Guarda **solo le pagine pubblicate**: un blocco che sta in una bozza non lo
// vede nessuno, e dire il contrario sarebbe peggio del silenzio.

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const entity_tipo = searchParams.get('entity_tipo')
    const entity_id = searchParams.get('entity_id')
    if (!entity_tipo || !entity_id)
      return Response.json({ error: 'entity_tipo ed entity_id obbligatori' }, { status: 400 })

    // L'entità dev'essere della propria azienda: senza, si saprebbe come è
    // fatto il sito di un altro cliente.
    const { response } = await requireEntityAccess(request, entity_tipo, entity_id)
    if (response) return response

    const { data, error } = await supabaseAdmin.from('pagine')
      .select('blocks').eq('entity_tipo', entity_tipo).eq('entity_id', entity_id)
      .eq('status', 'pubblicata')
    if (error) return Response.json({ error: error.message }, { status: 500 })

    const tipi = new Set()
    for (const p of data || []) {
      for (const b of p.blocks || []) if (b?.type) tipi.add(b.type)
    }
    return Response.json({ blocchi: [...tipi] })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
