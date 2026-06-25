import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, requireEntityAccess, ENTITY_TABLES } from '@/lib/server-auth'
import { getTranslatableSource } from '@/lib/translate'

// Editor traduzioni (Fase 3 multilingua). Legge i testi traducibili IT di un'entità
// o di una sotto-pagina + la traduzione automatica e gli override manuali.
// Il PUT salva gli override: il motore guest li fa già vincere sull'automatica.

// Risolve il record da tradurre e ne verifica l'accesso. Per 'pagina' l'auth passa
// dall'entità proprietaria (entity_tipo/entity_id sulla riga pagine).
async function resolveTarget(request, tipo, id) {
  // Auth prima di qualsiasi lettura → niente leak di esistenza (404 vs 401) ai non loggati.
  const { response: authResp } = await requireAuth(request)
  if (authResp) return { error: authResp }

  if (tipo === 'pagina') {
    const { data: pagina } = await supabaseAdmin.from('pagine').select('*').eq('id', id).single()
    if (!pagina) return { error: NextResponse.json({ error: 'Pagina non trovata' }, { status: 404 }) }
    const { response } = await requireEntityAccess(request, pagina.entity_tipo, pagina.entity_id)
    if (response) return { error: response }
    return { record: pagina }
  }
  const table = ENTITY_TABLES[tipo]
  if (!table) return { error: NextResponse.json({ error: 'Tipo non valido' }, { status: 400 }) }
  const { response } = await requireEntityAccess(request, tipo, id)
  if (response) return { error: response }
  const { data: entity, err } = await supabaseAdmin.from(table).select('*').eq('id', id).single()
  if (err || !entity) return { error: NextResponse.json({ error: 'Entità non trovata' }, { status: 404 }) }
  return { record: entity }
}

export async function GET(request, { params }) {
  const { tipo, id } = await params
  const { record, error } = await resolveTarget(request, tipo, id)
  if (error) return error

  const lang = 'en'
  const source = getTranslatableSource(record, tipo)
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
  const { error } = await resolveTarget(request, tipo, id)
  if (error) return error

  const body = await request.json().catch(() => ({}))
  const lang = 'en'
  const overrides = body.overrides && typeof body.overrides === 'object' ? body.overrides : {}

  const { data: row } = await supabaseAdmin
    .from('entity_translations')
    .select('translations, source_hash')
    .eq('entity_tipo', tipo).eq('entity_id', id).eq('lang', lang)
    .maybeSingle()

  const { error: upErr } = await supabaseAdmin
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

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
