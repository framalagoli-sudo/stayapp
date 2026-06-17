import { requireAuth, getProfile } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-server'

// Export GDPR / portabilità dati di una singola azienda.
// Autorizzazione: super_admin (qualsiasi azienda) oppure admin della PROPRIA azienda.
// Restituisce un JSON scaricabile con tutte le tabelle filtrate per quell'azienda.
export async function GET(request, { params }) {
  const { id: aziendaId } = await params

  const { user, response } = await requireAuth(request)
  if (response) return response
  const profile = await getProfile(user.id)

  const isSuper = profile?.role === 'super_admin'
  const isOwnAdmin =
    profile?.azienda_id === aziendaId &&
    ['admin_azienda', 'admin_gruppo'].includes(profile?.role)
  if (!isSuper && !isOwnAdmin) {
    return Response.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  // L'azienda deve esistere
  const { data: azienda } = await supabaseAdmin.from('aziende').select('*').eq('id', aziendaId).single()
  if (!azienda) return Response.json({ error: 'Azienda non trovata' }, { status: 404 })

  // Raccogli gli ID delle entità dell'azienda (per le tabelle collegate indirettamente)
  const [propsRes, ristRes, attRes, eventiRes, risorseRes] = await Promise.all([
    supabaseAdmin.from('properties').select('id').eq('azienda_id', aziendaId),
    supabaseAdmin.from('ristoranti').select('id').eq('azienda_id', aziendaId),
    supabaseAdmin.from('attivita').select('id').eq('azienda_id', aziendaId),
    supabaseAdmin.from('eventi').select('id').eq('azienda_id', aziendaId),
    supabaseAdmin.from('risorse').select('id').eq('azienda_id', aziendaId),
  ])
  const propertyIds = (propsRes.data || []).map(r => r.id)
  const entityIds = [
    ...propertyIds,
    ...(ristRes.data || []).map(r => r.id),
    ...(attRes.data || []).map(r => r.id),
  ]
  const eventiIds = (eventiRes.data || []).map(r => r.id)
  const risorseIds = (risorseRes.data || []).map(r => r.id)

  const tables = {}
  const counts = {}

  // Esegue una query e salva i dati in modo tollerante agli errori: un problema su
  // una tabella non deve far fallire l'intero export.
  async function dump(name, run) {
    try {
      const { data, error } = await run()
      if (error) { tables[name] = { error: error.message }; counts[name] = `ERRORE: ${error.message}`; return }
      tables[name] = data || []
      counts[name] = (data || []).length
    } catch (e) {
      tables[name] = { error: e.message }
      counts[name] = `ERRORE: ${e.message}`
    }
  }

  // L'azienda stessa
  tables.aziende = [azienda]
  counts.aziende = 1

  // Tabelle con azienda_id diretto
  const directTables = [
    'profiles', 'properties', 'ristoranti', 'attivita', 'contatti', 'newsletters',
    'eventi', 'articoli', 'blog_categories', 'collegamenti', 'risorse', 'prenotazioni',
  ]
  for (const t of directTables) {
    await dump(t, () => supabaseAdmin.from(t).select('*').eq('azienda_id', aziendaId))
  }

  // Tabelle collegate indirettamente (se non ci sono entità, .in([]) → vuoto)
  await dump('requests', () => supabaseAdmin.from('requests').select('*').in('property_id', propertyIds.length ? propertyIds : ['00000000-0000-0000-0000-000000000000']))
  await dump('messages', () => supabaseAdmin.from('messages').select('*').in('property_id', propertyIds.length ? propertyIds : ['00000000-0000-0000-0000-000000000000']))
  await dump('page_views', () => supabaseAdmin.from('page_views').select('*').in('entity_id', entityIds.length ? entityIds : ['00000000-0000-0000-0000-000000000000']))
  await dump('event_bookings', () => supabaseAdmin.from('event_bookings').select('*').in('event_id', eventiIds.length ? eventiIds : ['00000000-0000-0000-0000-000000000000']))
  await dump('risorse_promozioni', () => supabaseAdmin.from('risorse_promozioni').select('*').in('risorsa_id', risorseIds.length ? risorseIds : ['00000000-0000-0000-0000-000000000000']))

  const exportData = {
    _meta: {
      azienda_id: aziendaId,
      azienda_nome: azienda.ragione_sociale || azienda.nome || null,
      exported_at: new Date().toISOString(),
      exported_by: user.email || user.id,
      version: 1,
      row_counts: counts,
    },
    tables,
  }

  const slug = (azienda.ragione_sociale || azienda.nome || 'azienda')
    .toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
  const date = new Date().toISOString().slice(0, 10)
  const filename = `oltrenova-export-${slug}-${date}.json`

  return new Response(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
