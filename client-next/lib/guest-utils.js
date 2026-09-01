import { supabaseAdmin } from './supabase-server'
import { canaliDelloStep } from './automazioni-canali'

export async function getCollegamenti(tipo, id) {
  const { data: links } = await supabaseAdmin
    .from('collegamenti')
    .select('*')
    .or(`and(from_tipo.eq.${tipo},from_id.eq.${id}),and(to_tipo.eq.${tipo},to_id.eq.${id})`)

  if (!links?.length) return []
  const result = []
  for (const link of links) {
    const isFrom = link.from_tipo === tipo && link.from_id === id
    const otherTipo = isFrom ? link.to_tipo : link.from_tipo
    const otherId   = isFrom ? link.to_id   : link.from_id
    let entity = null
    if (otherTipo === 'struttura' || otherTipo === 'ristorante') {
      // Una tabella sola: prima erano due rami identici tranne che per il nome
      // della tabella e un campo. `schedule` ora esiste per entrambi, quindi si
      // chiede sempre — chi non ce l'ha valorizzato restituisce null, come prima.
      const { data } = await supabaseAdmin.from('entita')
        .select('id, name, slug, logo_url, cover_url, description, schedule')
        .eq('id', otherId).eq('tipo', otherTipo).eq('active', true).maybeSingle()
      entity = data
    }
    if (entity) result.push({ tipo: otherTipo, ...entity })
  }
  return result
}

export async function triggerAutomazione(trigger_evento, { azienda_id, entity_tipo, entity_id } = {}, vars = {}) {
  if (!azienda_id || !entity_tipo || !entity_id) return
  // Un recapito qualsiasi basta a entrare: quale serva davvero lo decide il
  // canale dello step, più sotto. Pretendere l'email anche per un invio
  // WhatsApp scarterebbe in silenzio una coda valida.
  if (!vars.email && !vars.telefono) return
  try {
    const { data: lista } = await supabaseAdmin.from('automazioni')
      .select('*')
      .eq('azienda_id', azienda_id)
      .eq('entity_tipo', entity_tipo)
      .eq('entity_id', entity_id)
      .eq('trigger_evento', trigger_evento)
      .eq('attiva', true)
    if (!lista?.length) return

    const now = Date.now()
    const logs = []
    for (const auto of lista) {
      const steps = Array.isArray(auto.steps) ? auto.steps : []
      steps.forEach((step, idx) => {
        const delayMs = (Number(step.delay_ore) || 0) * 3_600_000
        let scheduledAt
        if (trigger_evento === 'pre_visita' && vars.visit_datetime) {
          scheduledAt = new Date(new Date(vars.visit_datetime).getTime() - delayMs)
        } else if (trigger_evento === 'post_visita' && vars.visit_datetime) {
          scheduledAt = new Date(new Date(vars.visit_datetime).getTime() + delayMs)
        } else {
          scheduledAt = new Date(now + delayMs)
        }
        if (scheduledAt.getTime() < now - 120_000) return
        // Uno step «email e WhatsApp» lascia due righe. Ognuna ha il suo esito:
        // se il numero non è collegato deve fallire il WhatsApp e arrivare
        // comunque l'email.
        for (const canale of canaliDelloStep(step)) {
          // Senza il recapito giusto la riga non si crea nemmeno: meglio niente
          // che una coda destinata a fallire a ogni giro del cron.
          if (canale === 'email' && !vars.email) continue
          if (canale === 'whatsapp' && !vars.telefono) continue
          logs.push({
            automazione_id: auto.id,
            step_index: idx,
            canale,
            source_tipo: vars.source_tipo || null,
            source_id: vars.source_id || null,
            contact_email: vars.email || null,
            contact_telefono: vars.telefono || null,
            contact_nome: vars.nome || null,
            vars,
            scheduled_at: scheduledAt.toISOString(),
          })
        }
      })
    }
    if (logs.length) await supabaseAdmin.from('automazioni_log').insert(logs)
  } catch (e) { console.error('[triggerAutomazione]', e.message) }
}
