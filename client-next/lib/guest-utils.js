import { supabaseAdmin } from './supabase-server'

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
    if (otherTipo === 'struttura') {
      const { data } = await supabaseAdmin.from('properties')
        .select('id, name, slug, logo_url, cover_url, description')
        .eq('id', otherId).eq('active', true).single()
      entity = data
    } else if (otherTipo === 'ristorante') {
      const { data } = await supabaseAdmin.from('ristoranti')
        .select('id, name, slug, logo_url, cover_url, description, schedule')
        .eq('id', otherId).eq('active', true).single()
      entity = data
    }
    if (entity) result.push({ tipo: otherTipo, ...entity })
  }
  return result
}

export async function triggerAutomazione(trigger_evento, { azienda_id, entity_tipo, entity_id } = {}, vars = {}) {
  if (!azienda_id || !entity_tipo || !entity_id) return
  if (!vars.email) return
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
        logs.push({
          automazione_id: auto.id,
          step_index: idx,
          source_tipo: vars.source_tipo || null,
          source_id: vars.source_id || null,
          contact_email: vars.email,
          contact_nome: vars.nome || null,
          vars,
          scheduled_at: scheduledAt.toISOString(),
        })
      })
    }
    if (logs.length) await supabaseAdmin.from('automazioni_log').insert(logs)
  } catch (e) { console.error('[triggerAutomazione]', e.message) }
}
