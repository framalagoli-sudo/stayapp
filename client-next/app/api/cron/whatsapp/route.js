import { eseguiProgrammate } from '@/lib/whatsapp-send'
import { supabaseAdmin } from '@/lib/supabase-server'
import { decifra, statoTemplate } from '@/lib/whatsapp'
import { CATALOGO, nomeMeta } from '@/lib/whatsapp-catalogo'
import { logError } from '@/lib/observability'

// Due lavori: mandare le campagne programmate arrivate a scadenza, e controllare
// se Meta ha approvato i messaggi in attesa — altrimenti il cliente resterebbe a
// guardare "in attesa" senza sapere che nel frattempo è diventato "approvato".
export const maxDuration = 60

export async function GET(request) {
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const campagne = await eseguiProgrammate()
    const template = await aggiornaTemplateInAttesa()
    console.log('[cron/whatsapp]', JSON.stringify({ campagne: campagne.length, template }))
    return Response.json({ ok: true, campagne, template })
  } catch (e) {
    await logError('cron/whatsapp', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}

async function aggiornaTemplateInAttesa() {
  const { data: attesa } = await supabaseAdmin
    .from('whatsapp_template')
    .select('id, azienda_id, catalogo_key, catalogo_versione, nome_meta')
    .eq('stato', 'in_attesa')
    .limit(30)
  if (!attesa?.length) return { controllati: 0, approvati: 0 }

  let approvati = 0
  for (const t of attesa) {
    const { data: account } = await supabaseAdmin
      .from('whatsapp_account').select('waba_id, access_token_cifrato')
      .eq('azienda_id', t.azienda_id).maybeSingle()
    const token = decifra(account?.access_token_cifrato)
    if (!account?.waba_id || !token) continue

    const nome = t.nome_meta || nomeMeta(t.catalogo_key, t.catalogo_versione)
    const r = await statoTemplate(account.waba_id, token, nome)
    if (!r.ok || !r.data) continue

    const stato = { APPROVED: 'approvato', REJECTED: 'rifiutato', PENDING: 'in_attesa', DISABLED: 'disabilitato' }[r.data.status]
    if (!stato || stato === 'in_attesa') continue

    await supabaseAdmin.from('whatsapp_template').update({
      stato,
      template_meta_id: r.data.id || null,
      motivo_rifiuto: stato === 'rifiutato' ? (r.data.rejected_reason || 'rifiutato da Meta') : null,
      updated_at: new Date().toISOString(),
    }).eq('id', t.id)
    if (stato === 'approvato') approvati++
  }
  return { controllati: attesa.length, approvati }
}
