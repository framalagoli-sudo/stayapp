import { supabaseAdmin } from '@/lib/supabase-server'
import { giroResoconti } from '@/lib/resoconti'
import { logError } from '@/lib/observability'
import { battitoEControllo } from '@/lib/cron-battito'

// I resoconti per email ai titolari (lib/resoconti.js). Gira ogni ora: per
// ogni azienda decide il suo fuso se oggi è il lunedì (o il 1° del mese) e se
// sono passate le 8. Il registro `resoconti_inviati` impedisce i doppioni.
//
// ⛔ Spento finché il proprietario non accende `platform_config.resoconti_attivi`
// da Impostazioni: non è un guasto, è una funzione che nessuno ha ancora acceso.

export async function GET(request) {
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { data: cfg, error } = await supabaseAdmin.from('platform_config')
      .select('resoconti_attivi').eq('id', 1).maybeSingle()
    if (error) throw new Error(error.message)
    if (!cfg?.resoconti_attivi) {
      await battitoEControllo('resoconti')
      return Response.json({ ok: true, saltato: 'resoconti spenti' })
    }
    const esito = await giroResoconti()
    await battitoEControllo('resoconti')
    return Response.json({ ok: true, ...esito })
  } catch (e) {
    await logError('cron/resoconti', e, { alert: true })
    return Response.json({ error: e.message }, { status: 500 })
  }
}
