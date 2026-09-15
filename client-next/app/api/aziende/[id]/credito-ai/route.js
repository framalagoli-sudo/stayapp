import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { statoBudget, meseCorrente, BUDGET_MENSILE_PREDEFINITO_USD } from '@/lib/ai-consumi'

// Il credito AI di un'azienda: quanto ha speso, quanto può spendere, e la
// ricarica. Solo il super_admin: il cliente vede la percentuale nel pannello,
// mai le cifre, e non può alzarsi il tetto da solo.

async function soloSuperAdmin(request) {
  const { user, response } = await requireAuth(request)
  if (response) return { response }
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return { response: Response.json({ error: 'Non trovato' }, { status: 404 }) }
  return {}
}

// Un importo in dollari arriva dal browser: numero finito fra 0 e 1000, due
// decimali. Stessi limiti del CHECK nella migration 121.
function importo(v) {
  if (v === null || v === '') return null
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0 || n > 1000) return undefined
  return Math.round(n * 100) / 100
}

async function credito(id, tettoSuMisura) {
  const stato = await statoBudget(id)
  return {
    speso: stato.speso, budget: stato.budget, base: stato.base, extra: stato.extra,
    percentuale: stato.percentuale, esaurito: stato.esaurito,
    predefinito: BUDGET_MENSILE_PREDEFINITO_USD, mese: meseCorrente(),
    tetto_su_misura: tettoSuMisura != null ? Number(tettoSuMisura) : null,
  }
}

export async function GET(request, props) {
  const params = await props.params
  try {
    const { response } = await soloSuperAdmin(request)
    if (response) return response
    const { data: az } = await supabaseAdmin.from('aziende').select('id, ai_budget_mensile_usd').eq('id', params.id).maybeSingle()
    if (!az) return Response.json({ error: 'Azienda non trovata' }, { status: 404 })
    return Response.json(await credito(az.id, az.ai_budget_mensile_usd))
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

// { tetto_su_misura: number|null }  → tetto permanente (null = predefinito)
// { extra_mese: number }            → credito in più SOLO per il mese corrente
export async function PATCH(request, props) {
  const params = await props.params
  try {
    const { response } = await soloSuperAdmin(request)
    if (response) return response
    const body = await request.json().catch(() => ({}))
    const aggiorna = {}
    if ('tetto_su_misura' in body) {
      const v = importo(body.tetto_su_misura)
      if (v === undefined) return Response.json({ error: 'Tetto non valido: un numero fra 0 e 1000' }, { status: 400 })
      aggiorna.ai_budget_mensile_usd = v
    }
    if ('extra_mese' in body) {
      const v = importo(body.extra_mese)
      if (v === undefined) return Response.json({ error: 'Credito extra non valido: un numero fra 0 e 1000' }, { status: 400 })
      // Il mese lo decide il server, non il browser: vale per quello in corso.
      aggiorna.ai_extra_usd = v || null
      aggiorna.ai_extra_mese = v ? meseCorrente() : null
    }
    if (!Object.keys(aggiorna).length) return Response.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })

    const { data, error } = await supabaseAdmin.from('aziende').update(aggiorna).eq('id', params.id).select('id, ai_budget_mensile_usd').maybeSingle()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    if (!data) return Response.json({ error: 'Azienda non trovata' }, { status: 404 })
    return Response.json(await credito(data.id, data.ai_budget_mensile_usd))
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
