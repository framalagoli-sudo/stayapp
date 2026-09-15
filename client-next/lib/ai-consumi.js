import { supabaseAdmin } from './supabase-server'
import { sendEmail } from './send-email'
import { platformEmailTemplate } from './email-template'

// L'UNICO punto da cui la piattaforma parla con l'AI.
//
// ⛔ Il 15/09/2026, con le credenziali già consegnate a più clienti, delle 13
// chiamate all'AI solo il chatbot pubblico aveva un limite vero. Quattro avevano
// un «limite» tenuto in una `new Map()`, che su Vercel riparte da zero a ogni
// istanza: sembrava una protezione e non proteggeva niente. Le altre nessuno.
// E nessuna registrava quanto costava.
//
// Ora ogni chiamata passa di qui: PRIMA si controlla il tetto mensile
// dell'azienda, DOPO si scrive in `ai_consumi` quanto è costata davvero, con i
// token letti dalla risposta di Anthropic. Chiamare `api.anthropic.com` da un
// altro file lo segnala `tests/verifica-regole.mjs`.
//
// ⚠️ Il controllo avviene prima della chiamata e la spesa si scrive dopo: più
// chiamate partite insieme a un passo dal tetto lo superano di quanto costano
// loro. È un margine di centesimi, non una falla — il tetto vero della
// piattaforma resta il limite di spesa impostato sulla Console di Anthropic.

export const MODELLO_VELOCE = 'claude-haiku-4-5-20251001'
export const MODELLO_FEDELE = 'claude-sonnet-4-6'

// Tetto mensile di un'azienda che non ne ha uno suo (`aziende.ai_budget_mensile_usd`).
export const BUDGET_MENSILE_PREDEFINITO_USD = 5

// Dollari per milione di token, listino Anthropic verificato il 15/09/2026.
// Se il listino cambia, le righe già scritte restano con il costo di allora.
const LISTINO = {
  [MODELLO_VELOCE]: { input: 1, output: 5 },
  [MODELLO_FEDELE]: { input: 3, output: 15 },
}
// Un modello che non è nel listino si conta al prezzo più alto: sbagliare per
// eccesso ferma un cliente un po' prima, sbagliare per difetto non lo ferma.
const LISTINO_IGNOTO = { input: 15, output: 75 }

const SOGLIA_AVVISO = 0.8
const ALERT_TO = (process.env.ERROR_ALERT_EMAIL || process.env.DEMO_NOTIFY_EMAIL || '').trim()
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function costoChiamata(modello, tokenInput, tokenOutput) {
  const p = LISTINO[modello] || LISTINO_IGNOTO
  return (tokenInput * p.input + tokenOutput * p.output) / 1_000_000
}

// Lanciata quando un'azienda ha finito il credito del mese. Ogni route la
// riconosce con `eBudgetEsaurito` e risponde 429 con `messaggio`.
export class BudgetAIEsaurito extends Error {
  constructor() {
    super('Budget AI del mese esaurito')
    this.name = 'BudgetAIEsaurito'
  }
}
export const eBudgetEsaurito = e => e?.name === 'BudgetAIEsaurito'

// Quello che legge il cliente: niente dollari (non paga l'AI a consumo) e la
// data in cui si rinnova, perché «riprova più tardi» non gli dice quando.
export function messaggioBudgetEsaurito() {
  const adesso = new Date()
  const rinnovo = new Date(Date.UTC(adesso.getUTCFullYear(), adesso.getUTCMonth() + 1, 1))
  const mese = rinnovo.toLocaleDateString('it-IT', { month: 'long', timeZone: 'UTC' })
  return `Hai usato tutto il credito AI di questo mese: si rinnova il 1° ${mese}. Se ti serve prima, scrivici.`
}
export function rispostaBudgetEsaurito() {
  return Response.json({ error: messaggioBudgetEsaurito(), budget_esaurito: true }, { status: 429 })
}

// Quanto ha speso l'azienda nel mese e quanto può spendere.
// Senza azienda (il super_admin, una traduzione di piattaforma) non c'è tetto.
// ⚠️ Se la lettura fallisce si LANCIA: un tetto che in caso di dubbio lascia
// passare è la stessa finta protezione che questo file sostituisce.
export async function statoBudget(azienda_id) {
  if (!azienda_id) return { speso: 0, budget: null, percentuale: 0, esaurito: false }
  const [{ data: speso, error: e1 }, { data: az, error: e2 }] = await Promise.all([
    supabaseAdmin.rpc('ai_speso_mese', { p_azienda: azienda_id }),
    supabaseAdmin.from('aziende').select('ragione_sociale, ai_budget_mensile_usd, ai_extra_usd, ai_extra_mese').eq('id', azienda_id).maybeSingle(),
  ])
  if (e1 || e2) throw new Error(`Lettura del budget AI fallita: ${(e1 || e2).message}`)
  const base = az?.ai_budget_mensile_usd != null ? Number(az.ai_budget_mensile_usd) : BUDGET_MENSILE_PREDEFINITO_USD
  // Il credito extra vale solo nel mese in cui è stato dato: il mese dopo sparisce da solo.
  const extra = az?.ai_extra_mese === meseCorrente() ? Number(az.ai_extra_usd) || 0 : 0
  const budget = base + extra
  const spesoN = Number(speso) || 0
  const percentuale = budget > 0 ? Math.min(100, Math.round((spesoN / budget) * 100)) : 100
  return { speso: spesoN, budget, base, extra, percentuale, esaurito: spesoN >= budget, nome: az?.ragione_sociale || '' }
}

// Mese UTC in forma AAAA-MM: lo stesso con cui la funzione SQL somma la spesa.
export function meseCorrente() {
  return new Date().toISOString().slice(0, 7)
}

// Blocca in anticipo, prima di un lavoro che farebbe più chiamate e toccherebbe
// dati: meglio un «credito finito» subito che un sito riscritto a metà.
export async function assicuraBudget(azienda_id) {
  const stato = await statoBudget(azienda_id)
  if (stato.esaurito) {
    await avvisaSoglia(azienda_id, stato, 100)
    throw new BudgetAIEsaurito()
  }
  return stato
}

// Un avviso a Francesco per soglia, per azienda, per mese — non uno a chiamata.
// Il tetto entra nella chiave: dopo una ricarica, arrivare di nuovo all'80% o
// al 100% dello stesso mese è un fatto nuovo e merita un avviso nuovo.
async function avvisaSoglia(azienda_id, stato, soglia) {
  if (!ALERT_TO || !azienda_id) return
  try {
    const mese = meseCorrente()
    const { data: primaVolta } = await supabaseAdmin.rpc('check_rate_limit', {
      p_key: `ai-soglia:${soglia}:${azienda_id}:${mese}:${stato.budget}`, p_limit: 1, p_window_seconds: 40 * 86400,
    })
    if (primaVolta !== true) return
    const titolo = soglia >= 100 ? 'Credito AI esaurito' : `Credito AI all'${soglia}%`
    await sendEmail({
      _ctx: 'ai-budget',
      to: ALERT_TO,
      subject: `${titolo}: ${stato.nome || azienda_id}`,
      html: platformEmailTemplate({
        title: titolo,
        intro: `<strong>${esc(stato.nome || azienda_id)}</strong> ha speso <strong>$${stato.speso.toFixed(2)}</strong> di AI questo mese, su un tetto di <strong>$${stato.budget.toFixed(2)}</strong>.`
          + (soglia >= 100 ? '<br><br>Le funzioni AI sono ferme per questa azienda fino al primo del mese, a meno di una ricarica.' : '')
          + '<br><br>Per dare credito in più: <strong>Aziende → Credito AI</strong>.',
        footerNote: 'Un solo avviso per soglia e per mese. Il dettaglio è in Diagnostica.',
      }),
    })
  } catch {}
}

async function registra({ azienda_id, funzione, modello, tokenInput, tokenOutput }) {
  const costo_usd = costoChiamata(modello, tokenInput, tokenOutput)
  const { error } = await supabaseAdmin.from('ai_consumi').insert({
    azienda_id: azienda_id || null, funzione, modello,
    token_input: tokenInput, token_output: tokenOutput, costo_usd,
  })
  // La risposta è già stata pagata: non la si butta via per un conteggio
  // fallito, ma un conteggio che fallisce in silenzio rende il tetto cieco.
  if (error) console.error('[ai-consumi] registrazione fallita:', funzione, error.message)
  return costo_usd
}

// Chiama l'AI e restituisce il testo.
//
//   azienda_id       chi paga (null = piattaforma, nessun tetto)
//   funzione         cosa l'ha chiesta, es. 'content-studio/caption'
//   prompt | messages, system, maxTokens, modello, timeoutMs
//   controllaBudget  false solo dove fermarsi farebbe più danno che spendere:
//                    le traduzioni delle pagine pubbliche (si pagano una volta
//                    per contenuto e senza, il sito inglese resterebbe italiano)
export async function chiamaAI({
  azienda_id = null, funzione, prompt, messages, system,
  maxTokens = 500, modello = MODELLO_VELOCE, timeoutMs = 90_000, controllaBudget = true,
}) {
  if (!funzione) throw new Error('chiamaAI: manca `funzione`')
  const apiKey = (process.env.ANTHROPIC_API_KEY ?? '').trim()
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY non configurata')

  let stato = null
  if (controllaBudget && azienda_id) stato = await assicuraBudget(azienda_id)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let data
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: modello,
        max_tokens: maxTokens,
        ...(system ? { system } : {}),
        messages: messages || [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error?.message || `Anthropic API error ${res.status}`)
    }
    data = await res.json()
  } finally { clearTimeout(timer) }

  const costo = await registra({
    azienda_id, funzione, modello,
    tokenInput: data?.usage?.input_tokens || 0,
    tokenOutput: data?.usage?.output_tokens || 0,
  })

  if (stato?.budget) {
    const dopo = stato.speso + costo
    if (stato.speso < stato.budget * SOGLIA_AVVISO && dopo >= stato.budget * SOGLIA_AVVISO) {
      await avvisaSoglia(azienda_id, { ...stato, speso: dopo }, Math.round(SOGLIA_AVVISO * 100))
    }
  }

  return (data?.content?.[0]?.text || '').trim()
}
