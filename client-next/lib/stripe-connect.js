import Stripe from 'stripe'

// L'unico punto che parla con Stripe Connect.
//
// ── Il modello, e perché è questo ───────────────────────────────────────────
//
// Ogni cliente ha il **proprio** account Stripe e incassa sul suo conto. I
// pagamenti nascono lì (addebiti diretti), non sul nostro: OltreNova non tocca
// mai il denaro e **non trattiene alcuna commissione**.
//
// Le tre responsabilità sono su Stripe, ed è la parte che conta:
//   fees_collector: 'stripe'    → le commissioni le incassa Stripe dal cliente
//   losses_collector: 'stripe'  → i saldi negativi se li prende Stripe
//   (requirements li raccoglie Stripe, con l'attivazione ospitata da loro)
//
// Verificato sul campo il 31/08/2026: la piattaforma è abilitata a creare
// account così, e la risposta dell'API li conferma tutti e tre.
//
// ⚠️ Il difetto da cui guardarsi: se questi campi venissero omessi, il valore
// predefinito è `application` — cioè **noi**. Un account creato distrattamente
// senza `defaults` metterebbe le perdite dei clienti a carico di Francesco. Per
// questo stanno qui, in un posto solo, e non sparsi nelle route.
//
// ⛔ Mai `type: 'standard' | 'express' | 'custom'`: sono la vecchia API, e
// mescolano in un'etichetta cose che ora si dichiarano una per una.

// La versione dell'API v2 va dichiarata: senza, Stripe risponde 400.
const VERSIONE = '2026-08-26.dahlia'

let cliente = null
export function stripeConnect() {
  const chiave = (process.env.STRIPE_SECRET_KEY ?? '').trim()
  // ⚠️ Errore esplicito, non un ritorno silenzioso: la chiave mancante è
  // esattamente il guasto che ha tenuto lo shop senza pagamenti senza che
  // nessuno se ne accorgesse (`if (stripeKey && ...)` saltava il checkout).
  if (!chiave) throw new Error('STRIPE_SECRET_KEY non configurata: i pagamenti non possono funzionare')
  if (!cliente) cliente = new Stripe(chiave)
  return cliente
}

export function stripeConfigurato() {
  return !!(process.env.STRIPE_SECRET_KEY ?? '').trim()
}

// Crea l'account del cliente. Una volta sola: l'id si conserva.
export async function creaAccountCliente({ nome, email, paese = 'it' }) {
  return stripeConnect().v2.core.accounts.create({
    display_name: nome || 'Attività',
    contact_email: email || undefined,
    identity: { country: (paese || 'it').toLowerCase() },
    // Dashboard completa: il cliente gestisce da sé rimborsi, contestazioni e
    // report, e l'assistenza gliela dà Stripe. Se il rischio è suo, deve avere
    // anche gli strumenti.
    dashboard: 'full',
    defaults: { responsibilities: { fees_collector: 'stripe', losses_collector: 'stripe' } },
    configuration: {
      customer: {},
      merchant: { capabilities: { card_payments: { requested: true } } },
    },
  }, { apiVersion: VERSIONE })
}

// Il collegamento verso l'attivazione ospitata da Stripe.
//
// ⚠️ Scade: si genera al momento del clic e non si conserva. Un link salvato
// nel database sarebbe scaduto proprio quando serve.
export async function linkAttivazione(accountId, base) {
  const link = await stripeConnect().v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: 'account_onboarding',
      account_onboarding: {
        configurations: ['merchant', 'customer'],
        // ⛔ Tornava su `/admin/shop`, che di Stripe non sa niente: chi finiva
        // l'iscrizione atterrava su una pagina muta, con un parametro
        // nell'indirizzo e nessuno che gli dicesse com'era andata. Visto dal
        // vivo il 03/09, con un cliente davanti che non capiva.
        //
        // Si torna dove si era partiti, e lì la pagina commenta.
        refresh_url: `${base}/admin/pagamenti?stripe=riprova`,
        return_url: `${base}/admin/pagamenti?stripe=fatto`,
      },
    },
  }, { apiVersion: VERSIONE })
  return link.url
}

// Come si chiama, in italiano, la cosa che Stripe sta chiedendo.
//
// ⚠️ Se non la riconosciamo si restituisce l'identificativo grezzo, non una
// frase generica: «dato richiesto» sembra un'informazione e non lo è — chi la
// legge crede che gli manchi qualcosa senza sapere cosa, e rifà l'iscrizione da
// capo inseguendo un fantasma. Meglio una sigla brutta ma vera.
const NOMI_REQUISITI = {
  'individual.verification.document': 'documento d’identità del titolare',
  'representative.verification.document': 'documento d’identità del rappresentante',
  'company.verification.document': 'visura o documento della società',
  'external_account': 'IBAN dove ricevere gli incassi',
  'business_profile.url': 'indirizzo del sito',
  'business_profile.mcc': 'categoria dell’attività',
  'company.tax_id': 'partita IVA',
  'company.address': 'sede legale',
  'owners': 'elenco dei soci sopra il 25%',
  'directors': 'elenco degli amministratori',
  'tos_acceptance': 'accettazione delle condizioni Stripe',
}

function descriviRequisito(v) {
  if (!v) return null
  const chiave = v.id || v.type || v.field || v.requirement || v.name || null
  if (!chiave) {
    // Nessun identificativo: si mostra la voce intera, così almeno si vede.
    try { return JSON.stringify(v).slice(0, 120) } catch { return null }
  }
  return NOMI_REQUISITI[chiave] || chiave
}

// Come sta questo account — **chiesto sempre all'API, mai a una nostra copia**.
//
// I requisiti cambiano da soli quando cambiano le regole dei circuiti o dei
// regolatori: una copia nel nostro database direbbe «attivo» mentre l'account è
// bloccato, e il cliente scoprirebbe il guasto dal primo pagamento rifiutato.
export async function statoAccount(accountId) {
  if (!accountId) return { collegato: false }
  try {
    const a = await stripeConnect().v2.core.accounts.retrieve(accountId, {
      include: ['configuration.merchant', 'requirements', 'defaults'],
    }, { apiVersion: VERSIONE })

    const carte = a.configuration?.merchant?.capabilities?.card_payments?.status || 'inactive'
    const scadenza = a.requirements?.summary?.minimum_deadline?.status || null

    // ⛔ Non basta sapere che non incassa ancora: bisogna sapere PERCHÉ.
    //
    // «Manca qualcosa da compilare» e «Stripe sta verificando quello che hai
    // già dato» sono due situazioni diverse, e confonderle manda in tondo: il
    // 03/09, con un cliente davanti, il pannello diceva «completa su Stripe»,
    // Stripe rispondeva «hai già finito, conferma», e si tornava al punto di
    // partenza. Un giro senza uscita.
    //
    // Le voci davvero dovute adesso stanno in `requirements.entries`. Se
    // l'elenco non c'è (forma diversa, versione diversa), si ripiega sulla
    // scadenza — ma **senza** dedurre che manchi qualcosa: nel dubbio si dice
    // che è in verifica, che è la cosa vera nella maggior parte dei casi.
    const voci = Array.isArray(a.requirements?.entries) ? a.requirements.entries : null
    const dovuteOra = voci
      ? voci.filter(v => {
          const s = v?.minimum_deadline?.status || v?.status || null
          return s === 'currently_due' || s === 'past_due'
        })
      : null

    const daCompletare = dovuteOra
      ? dovuteOra.length > 0
      // Senza l'elenco: si considera «da completare» solo se è già scaduto,
      // che è l'unico caso in cui rimandarlo su Stripe serve di sicuro.
      : scadenza === 'past_due'

    // Ha finito la sua parte e ora tocca a Stripe controllare. Qui non si manda
    // nessuno da nessuna parte: si dice di aspettare.
    const inVerifica = !daCompletare && carte !== 'active'

    return {
      collegato: true,
      account_id: a.id,
      nome: a.display_name || '',
      incassa: carte === 'active',
      da_completare: daCompletare,
      in_verifica: inVerifica,
      // Cosa manca davvero, in chiaro: serve a non doverlo indovinare guardando
      // la faccia del cliente.
      // ⚠️ Non si inventa un'etichetta: si mostra quello che Stripe ha davvero
      // scritto. Il 03/09 la pagina diceva «dato richiesto» — cioè la mia
      // scritta di ripiego, che voleva dire «non so leggere questa risposta»
      // ed è stata scambiata per un'informazione. Un cliente ha rifatto
      // l'iscrizione due volte inseguendo un dato che nessuno gli nominava.
      mancanti: dovuteOra ? dovuteOra.map(descriviRequisito).filter(Boolean).slice(0, 12) : [],
      scadenza_stato: scadenza,
      stato_carte: carte,
      // La risposta com'è: serve a guardare invece di dedurre, quando la forma
      // non è quella che ci aspettavamo.
      requisiti_grezzi: a.requirements ?? null,
      // Si riporta anche chi porta il rischio: se un giorno un account
      // risultasse `application`, vuol dire che è stato creato fuori da qui e
      // le perdite tornerebbero a noi. Meglio vederlo che scoprirlo.
      responsabilita: a.defaults?.responsibilities || null,
    }
  } catch (e) {
    // Un account cancellato o irraggiungibile non deve rompere il pannello.
    return { collegato: false, errore: e.message }
  }
}
