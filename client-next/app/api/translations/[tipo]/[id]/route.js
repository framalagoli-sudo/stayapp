import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { requireEntityAccess, ENTITY_TABLES } from '@/lib/server-auth'
import { getTranslatableSource } from '@/lib/translate'

// Editor traduzioni (Fase 3 multilingua). Legge i testi traducibili IT di un'entità
// + la traduzione automatica (entity_translations.translations) e gli override manuali.
// Il PUT salva gli override: il motore guest li fa già vincere sull'automatica.

export async function GET(request, { params }) {
  const { tipo, id } = await params
  const { response } = await requireEntityAccess(request, tipo, id)
  if (response) return response

  const table = ENTITY_TABLES[tipo]
  if (!table) return NextResponse.json({ error: 'Tipo non valido' }, { status: 400 })

  const lang = 'en'
  const { data: entity, error } = await supabaseAdmin.from(table).select('*').eq('id', id).single()
  if (error || !entity) return NextResponse.json({ error: 'Entità non trovata' }, { status: 404 })

  const source = getTranslatableSource(entity, tipo)
  const { data: row } = await supabaseAdmin
    .from('entity_translations')
    .select('translations, overrides')
    .eq('entity_tipo', tipo).eq('entity_id', id).eq('lang', lang)
    .maybeSingle()

  const translations = row?.translations || {}
  const overrides = row?.overrides || {}
  const items = Object.entries(source).map(([key, src]) => ({
    key,
    source: src,
    auto: translations[key] || '',
    override: Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : null,
  }))

  return NextResponse.json({ lang, items })
}

export async function PUT(request, { params }) {
  const { tipo, id } = await params
  const { response } = await requireEntityAccess(request, tipo, id)
  if (response) return response

  const table = ENTITY_TABLES[tipo]
  if (!table) return NextResponse.json({ error: 'Tipo non valido' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const lang = 'en'
  const overrides = body.overrides && typeof body.overrides === 'object' ? body.overrides : {}

  const { data: row } = await supabaseAdmin
    .from('entity_translations')
    .select('translations, source_hash')
    .eq('entity_tipo', tipo).eq('entity_id', id).eq('lang', lang)
    .maybeSingle()

  const { error } = await supabaseAdmin
    .from('entity_translations')
    .upsert({
      entity_tipo: tipo,
      entity_id: id,
      lang,
      translations: row?.translations || {},
      overrides,
      // resetAuto: azzera l'hash → alla prossima visita EN la traduzione automatica
      // viene rigenerata (gli override restano, hanno priorità).
      source_hash: body.resetAuto ? '' : (row?.source_hash || ''),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'entity_tipo,entity_id,lang' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
