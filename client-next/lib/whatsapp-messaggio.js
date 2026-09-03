import { supabaseAdmin } from './supabase-server'
import { decifra, inviaTemplate, numeroValido } from './whatsapp'
import { trovaTemplate, nomeMeta } from './whatsapp-catalogo'
import { valoriTemplate } from './automazioni-canali'

// Mandare UN messaggio WhatsApp a una persona.
//
// Serve in più punti — il promemoria delle automazioni, la conferma di una
// prenotazione — e i controlli da fare sono sempre gli stessi. Stavano scritti
// dentro lo scheduler delle automazioni: portarli qui evita che il secondo
// chiamante ne dimentichi uno, ed è il modo in cui i controlli si perdono.
//
// ⚠️ Non lancia mai: restituisce `{ ok, motivo }`. Chi lo chiama sta facendo
// qualcos'altro di più importante — prendere una prenotazione, per esempio — e
// un messaggio non partito non deve portarsi dietro l'operazione vera.
//
// I quattro cancelli, in ordine di costo crescente:
//   1. il numero è scrivibile;
//   2. la persona ha dato il consenso;
//   3. l'azienda ha un numero collegato e attivo;
//   4. quel template è approvato da Meta **su quell'account**.
export async function inviaMessaggioWhatsapp({ aziendaId, telefono, email, templateKey, vars = {}, nomeEntita = '' }) {
  try {
    if (!aziendaId || !templateKey) return { ok: false, motivo: 'Dati mancanti' }
    if (!numeroValido(telefono)) return { ok: false, motivo: 'Numero non valido: serve il prefisso internazionale' }

    // 🔒 Il consenso si verifica **adesso**, non quando è stato raccolto: fra le
    // due cose possono passare ore, e nel frattempo si può revocare.
    // ⚠️ Due `.eq()` separati, mai un `.or()` costruito con la stringa: email e
    // telefono arrivano da un modulo pubblico, e dentro un filtro PostgREST una
    // virgola cambierebbe la condizione.
    const consenso = async (colonna, valore) => {
      if (!valore) return false
      const { data } = await supabaseAdmin.from('contatti').select('whatsapp_optin')
        .eq('azienda_id', aziendaId).eq(colonna, valore).limit(1).maybeSingle()
      return data?.whatsapp_optin === true
    }
    if (!(await consenso('telefono', telefono)) && !(await consenso('email', email))) {
      return { ok: false, motivo: 'Manca il consenso WhatsApp di questa persona' }
    }

    const { data: account } = await supabaseAdmin.from('whatsapp_account')
      .select('stato, phone_number_id, access_token_cifrato').eq('azienda_id', aziendaId).maybeSingle()
    if (!account || account.stato !== 'attivo') return { ok: false, motivo: 'Il numero WhatsApp non è collegato' }

    const t = trovaTemplate(templateKey)
    if (!t) return { ok: false, motivo: 'Messaggio non presente nel catalogo' }

    // I template sono asset del singolo numero: approvato «in generale» non
    // esiste, va approvato su quell'account.
    const { data: tpl } = await supabaseAdmin.from('whatsapp_template').select('stato')
      .eq('azienda_id', aziendaId).eq('catalogo_key', t.key).eq('catalogo_versione', t.versione).maybeSingle()
    if (!tpl || tpl.stato !== 'approvato') return { ok: false, motivo: `Il messaggio "${t.titolo}" non è ancora approvato da Meta` }

    const token = decifra(account.access_token_cifrato)
    if (!token) return { ok: false, motivo: 'Collegamento con WhatsApp non più valido' }

    const { valori, mancanti } = valoriTemplate(t, vars, { nomeEntita })
    if (mancanti.length) return { ok: false, motivo: `Dati mancanti: ${mancanti.join(', ')}` }

    const r = await inviaTemplate({
      phoneNumberId: account.phone_number_id, token, a: telefono,
      nomeTemplate: nomeMeta(t.key, t.versione), valori,
    })
    return r.ok ? { ok: true } : { ok: false, motivo: r.error || 'WhatsApp ha rifiutato il messaggio' }
  } catch (e) {
    return { ok: false, motivo: e.message }
  }
}
