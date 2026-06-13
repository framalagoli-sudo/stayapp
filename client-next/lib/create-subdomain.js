import { supabaseAdmin } from './supabase-server'

export async function createDefaultSubdomain({ azienda_id, entity_tipo, entity_id, entity_slug }) {
  const dominio = `${entity_slug}.oltrenova.com`
  try {
    const { data: existing } = await supabaseAdmin.from('domini').select('id').eq('dominio', dominio).maybeSingle()
    if (existing) return
    await supabaseAdmin.from('domini').insert({
      azienda_id, entity_tipo, entity_id, entity_slug,
      dominio, tipo: 'subdomain', stato: 'attivo',
    })
  } catch (e) { console.error('[createDefaultSubdomain]', e.message) }
}
