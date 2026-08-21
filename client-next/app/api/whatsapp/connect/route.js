import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, getProfile, resolveAziendaId } from '@/lib/server-auth'
import { CATALOGO, nomeMeta } from '@/lib/whatsapp-catalogo'
import { scambiaCodice, leggiNumeri, creaCatalogo, cifra, whatsappConfigurato } from '@/lib/whatsapp'

// Collegamento del numero WhatsApp del cliente.
// Il flusso di Meta (Embedded Signup) avviene nel suo browser e ci restituisce un
// codice: qui lo scambiamo con un token duraturo, leggiamo il numero e creiamo
// sul SUO account i messaggi del nostro catalogo, così li trova già pronti.
export const maxDuration = 60

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    const azienda_id = resolveAziendaId(profile, new URL(request.url).searchParams.get('azienda_id'))
    if (!azienda_id) return Response.json({ error: 'Azienda non valida' }, { status: 400 })

    const { data: account } = await supabaseAdmin
      .from('whatsapp_account')
      .select('id, waba_id, phone_number_id, numero_visualizzato, stato, quality_rating, limite_messaggi, collegato_il, ultima_verifica')
      .eq('azienda_id', azienda_id)
      .maybeSingle()

    const { data: templates } = await supabaseAdmin
      .from('whatsapp_template')
      .select('catalogo_key, catalogo_versione, stato, motivo_rifiuto')
      .eq('azienda_id', azienda_id)

    return Response.json({
      // Il token non esce di qui: la pagina non ne ha bisogno e chiunque lo
      // ottenesse avrebbe accesso completo all'account WhatsApp del cliente.
      account: account || null,
      templates: templates || [],
      configurato: whatsappConfigurato(),
      catalogo: CATALOGO.map(t => ({
        key: t.key, versione: t.versione, titolo: t.titolo, descrizione: t.descrizione,
        categoria: t.categoria, variabili: t.variabili, corpo: t.corpo,
      })),
    })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    const body = await request.json()
    const azienda_id = resolveAziendaId(profile, body.azienda_id)
    if (!azienda_id) return Response.json({ error: 'Azienda non valida' }, { status: 400 })
    if (!whatsappConfigurato()) {
      return Response.json({ error: 'WhatsApp non è ancora configurato sulla piattaforma. Contatta l’assistenza.' }, { status: 503 })
    }
    if (!body.code || !body.waba_id) {
      return Response.json({ error: 'Collegamento non completato: riprova dall’inizio.' }, { status: 400 })
    }

    const scambio = await scambiaCodice(body.code)
    if (!scambio.ok || !scambio.token) {
      return Response.json({ error: scambio.error || 'Non siamo riusciti a completare il collegamento' }, { status: 400 })
    }
    const token = scambio.token

    const numeri = await leggiNumeri(body.waba_id, token)
    if (!numeri.ok) return Response.json({ error: numeri.error }, { status: 400 })
    const numero = (numeri.data?.data || [])[0]
    if (!numero) {
      return Response.json({ error: 'Nessun numero trovato sull’account: completa la verifica del numero su Meta e riprova.' }, { status: 400 })
    }

    const { data: account, error: errAccount } = await supabaseAdmin.from('whatsapp_account').upsert({
      azienda_id,
      waba_id: body.waba_id,
      phone_number_id: numero.id,
      numero_visualizzato: numero.display_phone_number,
      stato: 'attivo',
      access_token_cifrato: cifra(token),
      quality_rating: numero.quality_rating || null,
      limite_messaggi: numero.messaging_limit_tier || null,
      collegato_il: new Date().toISOString(),
      ultima_verifica: new Date().toISOString(),
      dettaglio: { verified_name: numero.verified_name || null },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'azienda_id' }).select('id, numero_visualizzato, stato').single()
    if (errAccount) return Response.json({ error: errAccount.message }, { status: 500 })

    // I messaggi del catalogo vengono creati sul suo account e mandati in
    // approvazione: il cliente non deve scriverne nessuno.
    const esiti = await creaCatalogo(body.waba_id, token, CATALOGO)
    for (const e of esiti) {
      await supabaseAdmin.from('whatsapp_template').upsert({
        azienda_id,
        catalogo_key: e.key,
        catalogo_versione: e.versione,
        lingua: 'it',
        nome_meta: e.nome_meta,
        template_meta_id: e.template_meta_id,
        stato: e.ok ? 'in_attesa' : 'rifiutato',
        motivo_rifiuto: e.ok ? null : e.errore,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'azienda_id,catalogo_key,catalogo_versione,lingua' })
    }

    return Response.json({
      ok: true,
      account,
      messaggi_creati: esiti.filter(e => e.ok).length,
      messaggi_falliti: esiti.filter(e => !e.ok).map(e => ({ key: e.key, errore: e.errore })),
    })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

// Scollegare: si cancella tutto ciò che riguarda il collegamento, token compreso.
export async function DELETE(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    const azienda_id = resolveAziendaId(profile, new URL(request.url).searchParams.get('azienda_id'))
    if (!azienda_id) return Response.json({ error: 'Azienda non valida' }, { status: 400 })

    await supabaseAdmin.from('whatsapp_template').delete().eq('azienda_id', azienda_id)
    const { error } = await supabaseAdmin.from('whatsapp_account').delete().eq('azienda_id', azienda_id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
