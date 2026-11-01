import { supabaseAdmin } from '@/lib/supabase-server'
import { giroSentinella, mandaResoconto } from '@/lib/sentinella'
import { logError } from '@/lib/observability'
import { battitoEControllo } from '@/lib/cron-battito'

// La sentinella dei fornitori, ogni mattina: vedi `lib/sentinella.js`.
// L'email parte solo se una prova non passa.
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET(request) {
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const prove = await giroSentinella()
    const email = await mandaResoconto(prove)

    // La soglia va scritta prima del primo battito: senza, la riga nascerebbe
    // con i 60 minuti predefiniti e gli altri cron griderebbero «ferma» un'ora
    // dopo ogni giro. Una volta al giorno → 30 ore, come il backup.
    await supabaseAdmin.from('cron_battiti')
      .upsert({ nome: 'sentinella', soglia_minuti: 1800 }, { onConflict: 'nome', ignoreDuplicates: true })
    await battitoEControllo('sentinella')

    return Response.json({
      ok: true, email,
      prove: prove.map(p => ({ nome: p.nome, esito: p.esito, dettaglio: p.dettaglio })),
    })
  } catch (e) {
    await logError('cron/sentinella', e, { alert: true })
    return Response.json({ ok: false, error: e.message }, { status: 500 })
  }
}
