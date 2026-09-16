import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, getProfile, resolveAziendaId, entitaDellaAzienda } from '@/lib/server-auth'
import { accountDellAzienda } from '@/lib/whatsapp-account'
import { CATALOGO, nomeMeta } from '@/lib/whatsapp-catalogo'
import { scambiaCodice, leggiNumeri, creaCatalogo, cifra, whatsappConfigurato } from '@/lib/whatsapp'

// Collegamento del numero WhatsApp del cliente.
// Il flusso di Meta (Embedded Signup) avviene nel suo browser e ci restituisce un
// codice: qui lo scambiamo con un token duraturo, leggiamo il numero e creiamo
// sul SUO account i messaggi del nostro catalogo, così li trova già pronti.
export const maxDuration = 60

const META_APP_ID = (process.env.META_APP_ID ?? '').trim() || null
// La configurazione di Embedded Signup creata nella dashboard dell'app: dice a
// Meta quali permessi chiedere e cosa mostrare al cliente.
const META_ES_CONFIG_ID = (process.env.META_ES_CONFIG_ID ?? '').trim() || null

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    const azienda_id = resolveAziendaId(profile, new URL(request.url).searchParams.get('azienda_id'))
    if (!azienda_id) return Response.json({ error: 'Azienda non valida' }, { status: 400 })

    // Dal 16/09/2026 i numeri possono essere più d'uno: uno per entità, più
    // eventualmente quello «generale» dell'azienda (migration 122).
    const numeri = (await accountDellAzienda(azienda_id)).map(a => ({
      id: a.id, entity_id: a.entity_id, waba_id: a.waba_id, phone_number_id: a.phone_number_id,
      numero_visualizzato: a.numero_visualizzato, stato: a.stato,
      quality_rating: a.quality_rating, limite_messaggi: a.limite_messaggi,
      collegato_il: a.collegato_il, ultima_verifica: a.ultima_verifica,
    }))

    // Le entità a cui si può assegnare un numero: il pannello deve poter
    // chiedere «di chi è questo numero?» senza una seconda chiamata.
    const { data: entita } = await supabaseAdmin.from('entita')
      .select('id, name, tipo').eq('azienda_id', azienda_id).order('name')

    const { data: templates } = await supabaseAdmin
      .from('whatsapp_template')
      .select('catalogo_key, catalogo_versione, stato, motivo_rifiuto')
      .eq('azienda_id', azienda_id)

    return Response.json({
      // Il token non esce di qui: la pagina non ne ha bisogno e chiunque lo
      // ottenesse avrebbe accesso completo all'account WhatsApp del cliente.
      numeri,
      // `account` resta per compatibilità con il pannello finché legge il
      // singolo numero: è quello generale, o il primo collegato.
      account: numeri.find(n => !n.entity_id) || numeri[0] || null,
      entita: entita || [],
      templates: templates || [],
      configurato: whatsappConfigurato(),
      // Servono al browser per aprire il flusso di Meta e finiscono comunque
      // nell'URL di Facebook: non sono segreti (il segreto dell'app resta qui).
      // Passano da questa route, che chiede il login, invece che da una
      // variabile `NEXT_PUBLIC_`: così cambiarli non richiede una ricompilazione.
      meta: { app_id: META_APP_ID, config_id: META_ES_CONFIG_ID },
      // Il pulsante compare solo se il flusso può davvero partire: senza la
      // configurazione di Embedded Signup si aprirebbe una finestra che non
      // conclude niente.
      collegamento_pronto: whatsappConfigurato() && !!META_ES_CONFIG_ID,
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

    // Di chi è questo numero. Nessuna entità = numero dell'azienda, usato da
    // chi non ne ha uno proprio. ⚠️ `entity_id` arriva dal browser: senza questo
    // controllo si aggancerebbe un numero all'entità di un altro cliente.
    let entity_id = body.entity_id || null
    if (entity_id) {
      const { data: ent } = await supabaseAdmin.from('entita')
        .select('id, azienda_id').eq('id', entity_id).maybeSingle()
      // Anche per il super_admin l'entità dev'essere di QUESTA azienda: quella
      // su cui sta lavorando è già stata scelta sopra.
      if (!ent || ent.azienda_id !== azienda_id) {
        return Response.json({ error: 'Attività non trovata' }, { status: 404 })
      }
    }

    const numeri = await leggiNumeri(body.waba_id, token)
    if (!numeri.ok) return Response.json({ error: numeri.error }, { status: 400 })
    const elenco = numeri.data?.data || []
    // Il flusso di Meta dice quale numero ha appena verificato il cliente: un
    // account può averne più d'uno, e prendere «il primo» collegherebbe quello
    // sbagliato a chi ne collega un secondo.
    const numero = (body.phone_number_id && elenco.find(n => n.id === body.phone_number_id)) || elenco[0]
    if (!numero) {
      return Response.json({ error: 'Nessun numero trovato sull’account: completa la verifica del numero su Meta e riprova.' }, { status: 400 })
    }

    // Un numero già collegato altrove (anche a un'altra entità della stessa
    // azienda) si sposta, non si duplica: l'indice unico lo vieterebbe comunque,
    // ma il messaggio d'errore di Postgres non direbbe niente al cliente.
    await supabaseAdmin.from('whatsapp_account').delete()
      .eq('phone_number_id', numero.id).neq('azienda_id', azienda_id)

    const riga = {
      azienda_id,
      entity_id,
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
    }

    // Niente `upsert`: gli indici che tengono unico «un numero per entità» sono
    // parziali (escludono le righe senza entità) e PostgREST non sa dichiararli
    // in una clausola di conflitto. Si guarda prima se la riga c'è già.
    const esistente = (await accountDellAzienda(azienda_id))
      .find(a => (entity_id ? a.entity_id === entity_id : !a.entity_id))
    const { data: account, error: errAccount } = esistente
      ? await supabaseAdmin.from('whatsapp_account').update(riga).eq('id', esistente.id)
          .select('id, entity_id, numero_visualizzato, stato').single()
      : await supabaseAdmin.from('whatsapp_account').insert(riga)
          .select('id, entity_id, numero_visualizzato, stato').single()
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

// Scollegare. Con `account_id` si toglie UN numero; senza, si scollega tutto —
// e allora se ne vanno anche i modelli di messaggio, che sono dell'account.
// ⚠️ Togliere un numero solo NON tocca i modelli: restano agli altri numeri
// della stessa azienda, che continuano a scrivere.
export async function DELETE(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    const url = new URL(request.url)
    const azienda_id = resolveAziendaId(profile, url.searchParams.get('azienda_id'))
    if (!azienda_id) return Response.json({ error: 'Azienda non valida' }, { status: 400 })

    const account_id = url.searchParams.get('account_id')
    if (account_id) {
      // Scopato per azienda: un id altrui non cancella niente e risponde 404.
      const { data, error } = await supabaseAdmin.from('whatsapp_account').delete()
        .eq('id', account_id).eq('azienda_id', azienda_id).select('id')
      if (error) return Response.json({ error: error.message }, { status: 500 })
      if (!data?.length) return Response.json({ error: 'Numero non trovato' }, { status: 404 })
      return Response.json({ ok: true, rimossi: data.length })
    }

    await supabaseAdmin.from('whatsapp_template').delete().eq('azienda_id', azienda_id)
    const { error } = await supabaseAdmin.from('whatsapp_account').delete().eq('azienda_id', azienda_id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
