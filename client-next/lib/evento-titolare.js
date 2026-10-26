import { supabaseAdmin } from './supabase-server'
import { hostUfficiale } from './indirizzo-ufficiale'

// Chi organizza un evento, visto da chi gli scrive: il nome con cui firmare le
// email, i recapiti da dare all'ospite («contatta il locale») e la casella a cui
// mandare gli avvisi. Prima dall'entità dell'evento, poi dall'azienda.
export async function chiOrganizza(evento) {
  let nome = null, email = null, telefono = null
  if (evento?.entity_id) {
    const { data: ent } = await supabaseAdmin.from('entita').select('name, email, phone').eq('id', evento.entity_id).maybeSingle()
    if (ent) { nome = ent.name; email = ent.email; telefono = ent.phone }
  }
  if ((!email || !nome) && evento?.azienda_id) {
    const { data: az } = await supabaseAdmin.from('aziende').select('ragione_sociale, email').eq('id', evento.azienda_id).maybeSingle()
    if (az) { nome = nome || az.ragione_sociale; email = email || az.email }
  }
  return { nome: nome || 'OltreNova', email: email || null, telefono: telefono || null }
}

// Da dove si aprono i link che mandiamo all'ospite: il sito del cliente, se ha
// un indirizzo suo che risponde da noi, altrimenti il nostro. Le due pagine
// (`/annulla-evento`, `/posto-evento`) sono globali: esistono su tutti e due
// (`GLOBAL_PUBLIC_PATHS` in `middleware.js`).
export async function baseLink(evento) {
  const host = evento?.entity_id ? await hostUfficiale(evento.entity_id) : null
  if (host) return `https://${host}`
  return ((process.env.CLIENT_URL ?? '').trim() || 'https://www.oltrenova.com').replace(/\/$/, '')
}
