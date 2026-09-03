import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, getProfile, resolveAziendaId } from '@/lib/server-auth'
import { creaAccountCliente, linkAttivazione, statoAccount, stripeConfigurato } from '@/lib/stripe-connect'

// Il collegamento fra un'azienda cliente e il suo account Stripe.
//
// GET  → come sta (chiesto sempre all'API, mai a una copia nostra)
// POST → crea l'account se non c'è, e restituisce il link per l'attivazione
//
// ⚠️ Entrambe scopate per azienda: `resolveAziendaId` prende l'azienda del
// profilo, e solo un super_admin può indicarne un'altra. Senza questo, chiunque
// abbia un account potrebbe collegare — o leggere — l'incasso di un altro.

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    const { searchParams } = new URL(request.url)
    const azienda_id = resolveAziendaId(profile, searchParams.get('azienda_id'))
    if (!azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })

    if (!stripeConfigurato()) {
      // Detto chiaro invece di far comparire un pulsante che non funziona.
      return Response.json({ collegato: false, non_configurato: true })
    }

    const { data: az } = await supabaseAdmin.from('aziende')
      .select('stripe_account_id').eq('id', azienda_id).maybeSingle()

    return Response.json(await statoAccount(az?.stripe_account_id))
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    const body = await request.json().catch(() => ({}))
    const azienda_id = resolveAziendaId(profile, body.azienda_id)
    if (!azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })

    if (!stripeConfigurato())
      return Response.json({ error: 'Stripe non è ancora configurato su questo ambiente' }, { status: 503 })

    const { data: az } = await supabaseAdmin.from('aziende')
      .select('id, ragione_sociale, stripe_account_id').eq('id', azienda_id).maybeSingle()
    if (!az) return Response.json({ error: 'Azienda non trovata' }, { status: 404 })

    let accountId = az.stripe_account_id

    // ⚠️ Si crea **una volta sola**. Senza questo controllo, ogni clic su
    // «Collega» genererebbe un account nuovo: il cliente completerebbe
    // l'attivazione su uno e incasserebbe su un altro, e i due non si
    // parlerebbero mai.
    if (!accountId) {
      const { data: titolare } = await supabaseAdmin.from('profiles')
        .select('id').eq('azienda_id', azienda_id).limit(1).maybeSingle()
      const { data: utente } = titolare
        ? await supabaseAdmin.auth.admin.getUserById(titolare.id)
        : { data: null }

      // ⚠️ Solo l'email, per precompilare l'accesso. Il nome dell'azienda NON si
      // passa: dev'essere quello dei registri camerali, e il nostro potrebbe
      // essere scritto diversamente — è già costato a una cliente due iscrizioni
      // rifatte (vedi il commento in `creaAccountCliente`).
      const account = await creaAccountCliente({
        email: utente?.user?.email || undefined,
      })
      accountId = account.id

      const { error } = await supabaseAdmin.from('aziende')
        .update({ stripe_account_id: accountId }).eq('id', azienda_id)
      // Se non riusciamo a ricordarcelo, l'account esiste ma è orfano: meglio
      // fermarsi e dirlo che lasciare al prossimo clic il compito di crearne
      // un secondo.
      if (error) return Response.json({ error: `Account creato (${accountId}) ma non salvato: ${error.message}` }, { status: 500 })
    }

    // La base dell'indirizzo di ritorno viene dalla richiesta, non dal client:
    // un valore manomesso manderebbe il cliente altrove al ritorno da Stripe.
    const base = (process.env.CLIENT_URL ?? '').trim() || new URL(request.url).origin

    return Response.json({ url: await linkAttivazione(accountId, base), account_id: accountId })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
