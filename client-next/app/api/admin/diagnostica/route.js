import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { logError } from '@/lib/observability'

// Stato di salute della piattaforma, per il solo super_admin.
//
// Nasce da due guasti rimasti invisibili per settimane (il webhook dei rimbalzi,
// il chatbot muto su due verticali): serviva un posto dove *vedere* se le cose
// funzionano, invece di scoprirlo per caso.
//
// GET  → il quadro: a chi vanno gli avvisi, quanto sono usati i moduli, che
//        errori sono stati registrati di recente.
// POST → manda un avviso di PROVA, per verificare che la catena arrivi davvero
//        a destinazione prima di doverci contare sul serio.

async function soloSuperAdmin(request) {
  const { user, response } = await requireAuth(request)
  if (response) return { response }
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') {
    return { response: Response.json({ error: 'Non trovato' }, { status: 404 }) }
  }
  return { user }
}

const MODULI = [
  ['Pagine sito', 'pagine'], ['Contatti', 'contatti'], ['Richieste', 'requests'],
  ['Prenotazioni', 'prenotazioni'], ['Risorse prenotabili', 'risorse'],
  ['Eventi', 'eventi'], ['Posti evento venduti', 'event_bookings'],
  ['Blog', 'articoli'], ['Newsletter', 'newsletters'], ['Vetrine', 'vetrine'],
  ['Form builder', 'form_builder'], ['Preventivi', 'preventivi'],
  ['Recensioni', 'recensioni'], ['Shop', 'prodotti'], ['Loyalty', 'loyalty_programs'],
  ['Survey', 'survey_risposte'], ['Automazioni', 'automazioni'],
]

export async function GET(request) {
  try {
    const { response } = await soloSuperAdmin(request)
    if (response) return response

    // Dove finiscono gli avvisi. Il valore è nascosto sul dashboard di Vercel,
    // quindi mostrarlo qui è l'unico modo di accorgersi che punta all'indirizzo
    // sbagliato — cioè che nessuno leggerà mai un allarme.
    const destinatario = (process.env.ERROR_ALERT_EMAIL || process.env.DEMO_NOTIFY_EMAIL || '').trim()
    const sorgente = process.env.ERROR_ALERT_EMAIL?.trim()
      ? 'ERROR_ALERT_EMAIL' : (process.env.DEMO_NOTIFY_EMAIL?.trim() ? 'DEMO_NOTIFY_EMAIL (ripiego)' : null)

    const moduli = []
    for (const [nome, tabella] of MODULI) {
      const { count, error } = await supabaseAdmin.from(tabella).select('*', { count: 'exact', head: true })
      moduli.push({ nome, righe: error ? null : count })
    }

    // Processi automatici: quando hanno lavorato l'ultima volta. È l'unico modo
    // di accorgersi di uno che ha smesso di girare — il silenzio non produce
    // errori, e senza questo il guasto resterebbe invisibile come lo è stato per
    // il webhook dei rimbalzi.
    const { data: battiti } = await supabaseAdmin.from('cron_battiti').select('*').order('nome')
    const ora = Date.now()
    const processi = (battiti || []).map(b => {
      const fermoDa = Math.floor((ora - new Date(b.ultimo_ok).getTime()) / 60000)
      return {
        nome: b.nome,
        ultimoOk: b.ultimo_ok,
        fermoDaMinuti: fermoDa,
        sogliaMinuti: b.soglia_minuti,
        inRitardo: fermoDa > b.soglia_minuti,
        esecuzioni: b.esecuzioni,
      }
    })

    // Storico degli errori: oggi `logError` scrive solo su console ed email, non
    // in tabella. Va detto invece di mostrare una lista vuota — che si leggerebbe
    // come "nessun errore" mentre significa "non li registriamo". È lo stesso
    // inganno dei guasti silenziosi che stiamo cercando di eliminare.
    const { data: err } = await supabaseAdmin.from('error_log')
      .select('source, message, created_at').order('created_at', { ascending: false }).limit(15)

    return Response.json({
      avvisi: {
        destinatario: destinatario || null,
        sorgente,
        attivi: !!destinatario,
        nota: destinatario ? null : 'Nessun indirizzo configurato: gli avvisi non partono. Aggiungi ERROR_ALERT_EMAIL su Vercel e rideploya.',
      },
      processi: battiti
        ? processi
        : null, // migration 077 non ancora eseguita
      moduli,
      errori: err
        ? { registrati: true, recenti: err }
        : { registrati: false, recenti: [], nota: 'Gli errori non vengono conservati: finiscono nei log di Vercel e nelle email di avviso. Qui non c’è storico.' },
      generato: new Date().toISOString(),
    })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

// Avviso di prova: la catena si verifica prima di doverci contare.
export async function POST(request) {
  try {
    const { response } = await soloSuperAdmin(request)
    if (response) return response

    const destinatario = (process.env.ERROR_ALERT_EMAIL || process.env.DEMO_NOTIFY_EMAIL || '').trim()
    if (!destinatario) {
      return Response.json({
        ok: false,
        motivo: 'Nessun indirizzo configurato: né ERROR_ALERT_EMAIL né DEMO_NOTIFY_EMAIL.',
      }, { status: 400 })
    }

    // Gli avvisi sono deduplicati a uno all'ora per sorgente: la prova usa una
    // sorgente sempre diversa, altrimenti il secondo tentativo sembrerebbe fallito.
    const sorgente = `prova-avviso/${Date.now()}`
    await logError(sorgente, 'Avviso di PROVA richiesto dal pannello: se lo stai leggendo, la catena funziona.', { alert: true })

    return Response.json({
      ok: true,
      destinatario,
      messaggio: `Avviso di prova inviato a ${destinatario}. Se non arriva entro qualche minuto, controlla anche lo spam.`,
    })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
