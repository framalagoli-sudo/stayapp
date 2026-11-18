import { requireAuth, getProfile } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-server'
import { esportaAzienda } from '@/lib/esportazione-azienda'

// Esportazione GDPR / portabilità dei dati di una singola azienda.
// Autorizzazione: super_admin (qualsiasi azienda) oppure il titolare della PROPRIA.
// Quali tabelle e quali righe lo decide `lib/esportazione-azienda.js`, leggendo
// lo schema del database: qui niente elenchi scritti a mano.
export const maxDuration = 60

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

  const { data: azienda } = await supabaseAdmin.from('aziende').select('id, ragione_sociale').eq('id', aziendaId).maybeSingle()
  if (!azienda) return Response.json({ error: 'Azienda non trovata' }, { status: 404 })

  try {
    const { tables, counts, errori } = await esportaAzienda(aziendaId)
    const exportData = {
      _meta: {
        azienda_id: aziendaId,
        azienda_nome: azienda.ragione_sociale || null,
        exported_at: new Date().toISOString(),
        exported_by: user.email || user.id,
        version: 2,
        row_counts: counts,
        // Se una tabella non si è potuta leggere lo si dice: un'esportazione
        // incompleta che sembra completa è il difetto da cui nasce la v2.
        tabelle_non_lette: Object.keys(errori),
        note: 'I token (link di annullamento, disiscrizione, moduli) e le credenziali cifrate sono oscurati: sono chiavi d\'accesso, non dati.',
      },
      tables,
    }

    const slug = (azienda.ragione_sociale || 'azienda')
      .toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
    // regola-ok: è il nome di un file di export, non una data che qualcuno legge
    // come «oggi». In UTC va bene, ed è anche l'unico modo di ordinarli.
    const date = new Date().toISOString().slice(0, 10)
    const filename = `oltrenova-export-${slug}-${date}.json`

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
