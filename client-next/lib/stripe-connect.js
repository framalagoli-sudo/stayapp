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
        // Dove torna se il link è scaduto, e dove torna quando ha finito.
        refresh_url: `${base}/admin/shop?stripe=riprova`,
        return_url: `${base}/admin/shop?stripe=fatto`,
      },
    },
  }, { apiVersion: VERSIONE })
  return link.url
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
    // «Da completare» comprende sia ciò che manca adesso sia ciò che è già
    // scaduto: per chi legge sono la stessa cosa — deve tornare su Stripe.
    const daCompletare = scadenza === 'currently_due' || scadenza === 'past_due'

    return {
      collegato: true,
      account_id: a.id,
      nome: a.display_name || '',
      incassa: carte === 'active',
      da_completare: daCompletare,
      stato_carte: carte,
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
