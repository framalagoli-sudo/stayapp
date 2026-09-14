import { supabaseAdmin } from '@/lib/supabase-server'
import { ENTITY_TABLES } from '@/lib/server-auth'

// Il contrario di `resolve-domain`: dato un sito, qual è il suo indirizzo vero?
//
// Lo chiama il middleware per mandare chi arriva dal nostro indirizzo al
// dominio del cliente. Se il cliente non ne ha uno, non risponde niente e si
// resta dove si è.
//
// ⚠️ Solo domini `custom` e solo `stato = 'attivo'`. Quello stato è una misura,
// non una dichiarazione: `diagnosticaDominio` controlla Vercel, il DNS reale e
// fa una GET HTTPS vera, e il cron ripassa ogni 15 minuti. È la rete di
// sicurezza del redirect: se il dominio del cliente cade, entro un quarto d'ora
// smettiamo di mandarci traffico e il nostro indirizzo torna a servire il sito.
//
// Pubblica di proposito: dice solo quale dominio corrisponde a un sito già
// pubblico, cioè un'informazione che si legge dal sito stesso.

export const dynamic = 'force-dynamic'

const TIPI = ['struttura', 'ristorante', 'attivita']

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    const slug = searchParams.get('slug')?.trim().toLowerCase()
    const evento = searchParams.get('evento')?.trim()

    let entityId = null

    if (evento) {
      // L'evento sta su un indirizzo globale, ma appartiene a un sito: segue lui.
      const campo = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(evento) ? 'id' : 'slug'
      const { data } = await supabaseAdmin.from('eventi')
        .select('entity_id').eq(campo, evento).eq('published', true).eq('active', true).maybeSingle()
      entityId = data?.entity_id || null
    } else {
      if (!TIPI.includes(tipo) || !slug) return Response.json({}, { status: 400 })
      const tabella = ENTITY_TABLES[tipo]
      if (!tabella) return Response.json({}, { status: 400 })
      const { data } = await supabaseAdmin.from(tabella)
        .select('id').eq('slug', slug).eq('active', true).maybeSingle()
      entityId = data?.id || null
    }

    if (!entityId) return Response.json({}, { headers: cache() })

    const { data: dom } = await supabaseAdmin.from('domini')
      .select('dominio').eq('entity_id', entityId)
      .eq('tipo', 'custom').eq('stato', 'attivo').limit(1).maybeSingle()

    return Response.json({ dominio: dom?.dominio || null }, { headers: cache() })
  } catch {
    // Un errore qui non deve impedire di vedere il sito: si resta dove si è.
    return Response.json({}, { status: 200 })
  }
}

// La CDN assorbe le richieste ripetute: senza, ogni pagina vista sul nostro
// indirizzo costerebbe due query al database.
function cache() {
  return { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }
}
