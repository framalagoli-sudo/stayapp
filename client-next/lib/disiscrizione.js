import { supabaseAdmin } from '@/lib/supabase-server'

// La disiscrizione dalle email promozionali: un posto solo, due ingressi.
//
//  · il link «Annulla iscrizione» in fondo a ogni newsletter (GET, dalla pagina);
//  · il pulsante «Annulla iscrizione» che Gmail, Yahoo e gli altri mostrano
//    accanto al mittente (POST, RFC 8058): lo preme il programma di posta, non
//    una pagina nostra.
//
// ⛔ L'indirizzo per il pulsante deve stare su `www`: l'apex risponde 308 e chi
// fa la POST non segue i redirect (stessa storia dei webhook, nota 27). Un
// pulsante che non disiscrive è peggio di un pulsante assente: la persona
// crede di essersi tolta e continua a ricevere.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Da dove è arrivato il no. Lo decide il server: non è un testo che arriva da fuori.
export const FONTI_REVOCA = {
  link: 'link nell’email',
  pulsante: 'pulsante del programma di posta',
  titolare: 'tolto dal titolare',
}

// L'indirizzo che il programma di posta chiama. Sempre su `www`.
export function indirizzoDisiscrizione(appUrl, token, newsletterId) {
  const base = String(appUrl || 'https://www.oltrenova.com').replace(/\/+$/, '').replace('://oltrenova.com', '://www.oltrenova.com')
  return `${base}/api/guest/unsubscribe?token=${encodeURIComponent(token)}${newsletterId ? `&nl=${encodeURIComponent(newsletterId)}` : ''}`
}

// Le due intestazioni che fanno comparire il pulsante.
export function intestazioniDisiscrizione(appUrl, token, newsletterId) {
  return {
    'List-Unsubscribe': `<${indirizzoDisiscrizione(appUrl, token, newsletterId)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}

// Toglie la persona dalle promozioni e scrive quando e come l'ha chiesto.
// Chiamarla due volte non cambia niente: resta la data del primo no, e la
// newsletter conta una disiscrizione sola.
export async function disiscrivi(token, { newsletterId, fonte } = {}) {
  if (!UUID.test(String(token || ''))) return { ok: false }
  const { data: trovati, error } = await supabaseAdmin.from('contatti')
    .select('id, azienda_id, iscritto_newsletter').eq('unsubscribe_token', token).limit(1)
  if (error) throw new Error(error.message)
  const contatto = trovati?.[0]
  if (!contatto) return { ok: false }
  if (!contatto.iscritto_newsletter) return { ok: true, gia: true }

  const adesso = new Date().toISOString()
  const { data: tolti, error: errTogli } = await supabaseAdmin.from('contatti')
    .update({
      iscritto_newsletter: false,
      marketing_revoca_il: adesso,
      marketing_revoca_fonte: FONTI_REVOCA[fonte] || FONTI_REVOCA.link,
      updated_at: adesso,
    })
    .eq('id', contatto.id).eq('iscritto_newsletter', true).select('id')
  if (errTogli) throw new Error(errTogli.message)
  // Due richieste insieme (il pulsante e il link): conta solo quella che ha tolto davvero.
  if (!tolti?.length) return { ok: true, gia: true }

  // Il conto sulla newsletter: solo se è dell'azienda di questa persona. L'id
  // arriva dall'indirizzo, e senza questo controllo chiunque abbia un link
  // valido potrebbe gonfiare il conto di una newsletter altrui.
  if (UUID.test(String(newsletterId || ''))) {
    const { data: nl } = await supabaseAdmin.from('newsletters')
      .select('unsubscribes_count').eq('id', newsletterId).eq('azienda_id', contatto.azienda_id).maybeSingle()
    if (nl) await supabaseAdmin.from('newsletters').update({ unsubscribes_count: (nl.unsubscribes_count || 0) + 1 }).eq('id', newsletterId)
  }
  return { ok: true }
}
