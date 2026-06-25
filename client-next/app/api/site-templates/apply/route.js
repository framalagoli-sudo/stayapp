import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-server'
import { requireEntityAccess, ENTITY_TABLES } from '@/lib/server-auth'
import { getTemplate } from '@/lib/siteTemplates'

// Applica un template di sito all'entità: crea/aggiorna la pagina home (__home__)
// con i blocchi del template + applica il tema + attiva il minisito.
// Punto di partenza editabile in SitoPage (i contenuti sono d'esempio).

function addIdsToData(data) {
  const out = { ...(data || {}) }
  if (Array.isArray(out.items)) out.items = out.items.map(it => ({ id: randomUUID(), ...it }))
  return out
}
function withIds(blocks) {
  return (blocks || []).map(b => ({ ...b, id: randomUUID(), data: addIdsToData(b.data) }))
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const { entity_tipo, entity_id, template_id } = body
  if (!entity_tipo || !entity_id || !template_id) {
    return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })
  }

  const { response } = await requireEntityAccess(request, entity_tipo, entity_id)
  if (response) return response

  const table = ENTITY_TABLES[entity_tipo]
  if (!table) return NextResponse.json({ error: 'Tipo non valido' }, { status: 400 })

  const tpl = getTemplate(template_id)
  if (!tpl) return NextResponse.json({ error: 'Template non trovato' }, { status: 404 })

  const blocks = withIds(tpl.blocks)

  // Upsert pagina __home__
  const { data: existing } = await supabaseAdmin.from('pagine').select('id')
    .eq('entity_tipo', entity_tipo).eq('entity_id', entity_id).eq('slug', '__home__').maybeSingle()
  if (existing) {
    await supabaseAdmin.from('pagine').update({ blocks, status: 'pubblicata', updated_at: new Date().toISOString() }).eq('id', existing.id)
  } else {
    await supabaseAdmin.from('pagine').insert({
      entity_tipo, entity_id, titolo: 'Home', slug: '__home__', nel_menu: false,
      status: 'pubblicata', blocks, ordine: 0,
    })
  }

  // Applica tema + attiva minisito (merge, senza sovrascrivere altra config)
  const { data: ent } = await supabaseAdmin.from(table).select('theme, minisito').eq('id', entity_id).single()
  await supabaseAdmin.from(table).update({
    theme: { ...(ent?.theme || {}), ...tpl.theme },
    minisito: { ...(ent?.minisito || {}), active: true },
  }).eq('id', entity_id)

  return NextResponse.json({ ok: true, blocks: blocks.length })
}
