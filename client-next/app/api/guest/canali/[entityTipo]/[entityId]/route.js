import { supabaseAdmin } from '@/lib/supabase-server'
import { canaliDelloStep } from '@/lib/automazioni-canali'

// Su quali canali questa attività può davvero scrivere a chi prenota.
//
// Serve al modulo di prenotazione per decidere se mostrare la spunta «avvisami
// su WhatsApp». **Un consenso che non serve a niente non si chiede**: se il
// numero non è collegato, o se nessuna automazione manda niente su WhatsApp, la
// spunta non compare — chiederla lo stesso sarebbe raccogliere un dato in più
// senza motivo, che è esattamente ciò che il GDPR chiama eccessivo.
//
// ⚠️ Route pubblica di proposito: risponde a chi non ha fatto login, quindi
// esce **un solo booleano**. Non il numero, non lo stato dell'account, non le
// automazioni: che un'attività usi WhatsApp lo si vede comunque dal suo sito.
//
// ⚠️ Contratto nuovo, non modificato: la route delle risorse resta un array. Un
// modulo che gira nel browser di un cliente non deve rompersi perché noi
// abbiamo cambiato forma a una risposta che serviva già a qualcun altro.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TIPI = ['struttura', 'ristorante', 'attivita']

export const dynamic = 'force-dynamic'

export async function GET(request, props) {
  const params = await props.params
  try {
    const { entityTipo, entityId } = params
    // Il tipo si cerca in un catalogo chiuso: da qui finisce in una query.
    if (!TIPI.includes(entityTipo) || !UUID_RE.test(entityId)) {
      return Response.json({ whatsapp: false })
    }

    const { data: ent } = await supabaseAdmin.from('entita')
      .select('azienda_id').eq('id', entityId).eq('tipo', entityTipo).maybeSingle()
    if (!ent?.azienda_id) return Response.json({ whatsapp: false })

    const { data: account } = await supabaseAdmin.from('whatsapp_account')
      .select('stato').eq('azienda_id', ent.azienda_id).maybeSingle()
    if (account?.stato !== 'attivo') return Response.json({ whatsapp: false })

    const { data: automazioni } = await supabaseAdmin.from('automazioni')
      .select('steps').eq('entity_tipo', entityTipo).eq('entity_id', entityId).eq('attiva', true)

    const usaWhatsapp = (automazioni || []).some(a =>
      (Array.isArray(a.steps) ? a.steps : []).some(s => canaliDelloStep(s).includes('whatsapp')))

    return Response.json({ whatsapp: usaWhatsapp })
  } catch {
    // Nel dubbio non si chiede: un errore qui non deve far comparire una spunta
    // che promette un avviso che non arriverà.
    return Response.json({ whatsapp: false })
  }
}
