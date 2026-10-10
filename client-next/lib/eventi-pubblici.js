// Gli eventi che un sito mostra a chi non ha fatto login. Un posto solo: lo
// usano la route `/api/guest/eventi` (il browser, per tenerli freschi) e le
// pagine del sito, che li stampano già nell'HTML — un elenco che arriva solo
// dal browser, per un motore di ricerca è una pagina vuota.
//
// ⚠️ Solo server: apre il database con la chiave di servizio.
import { supabaseAdmin } from '@/lib/supabase-server'
import { getEntityAziendaId } from '@/lib/server-auth'
import { localizeEntity } from '@/lib/translate'
import { soloAperti, soloConclusi } from '@/lib/evento-concluso'
import { postiPubblici } from '@/lib/posti-evento'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_PASSATI = 12

// Di norma gli eventi non ancora finiti, dal più vicino. Con `passati` quelli
// conclusi, dal più recente, e pochi: sono memoria, non programma.
// Risponde `{ eventi }` oppure `{ errore }`.
export async function eventiPubblici({ entity_tipo, entity_id, lang = 'it', passati = false }) {
  let query = supabaseAdmin.from('eventi')
    // `aziende(fuso_orario)` non è un dettaglio: le schede mostrano l'ora
    // dell'evento, e senza fuso ognuno la leggerebbe nel proprio.
    .select('id, slug, title, description, cover_url, formato_cover, cover_focal, cta_label, cta_condizioni, mostra_prezzo, mostra_prezzo_pagina, prezzo_testo, prezzo_modo, date_start, date_end, location, price, seats_total, seats_booked, posti_riservati, packages, aziende(fuso_orario)')
    .eq('published', true).eq('active', true)
  query = passati
    ? soloConclusi(query).order('date_start', { ascending: false }).limit(MAX_PASSATI)
    : soloAperti(query).order('date_start')

  // `entity_tipo` finisce interpolato dentro la .or() qui sotto: va whitelistato
  // prima, come già si fa in /api/collegamenti (anti filter-injection).
  if (['struttura', 'ristorante', 'attivita'].includes(entity_tipo) && UUID_RE.test(entity_id || '')) {
    // Mostra gli eventi di questa entità + gli eventi "aziendali" (senza entità)
    // della stessa azienda: un evento aziendale compare sui siti di tutte le sue entità.
    const aziendaId = await getEntityAziendaId(entity_tipo, entity_id)
    if (aziendaId) {
      // `azienda_id` anche sul primo ramo: un evento di un'ALTRA azienda puntato
      // a questa entità non deve comparire qui (difesa in profondità — la scrittura
      // è già bloccata da `entitaDellaAzienda`, ma i record vecchi restano).
      query = query.or(`and(entity_tipo.eq.${entity_tipo},entity_id.eq.${entity_id},azienda_id.eq.${aziendaId}),and(entity_id.is.null,azienda_id.eq.${aziendaId})`)
    } else {
      query = query.eq('entity_tipo', entity_tipo).eq('entity_id', entity_id)
    }
  }
  const { data, error } = await query
  if (error) return { errore: error.message }

  // Il fuso esce come campo semplice: l'oggetto annidato dell'unione non è
  // roba che le pagine debbano conoscere.
  // I posti escono solo come «quanti se ne possono prenotare»: vedi postiPubblici.
  let eventi = (data || []).map(({ aziende, ...ev }) => ({ ...postiPubblici(ev), fuso: aziende?.fuso_orario || null }))
  if (lang === 'en') eventi = await Promise.all(eventi.map(ev => localizeEntity(ev, 'evento', lang)))
  return { eventi }
}

// Per le pagine del sito: gli eventi da stampare subito, se fra i blocchi ce
// n'è uno che li mostra. `null` = la pagina non ne ha bisogno (o non si sono
// potuti leggere: li chiederà il browser, come prima).
export async function eventiPerBlocchi(blocks, entity_tipo, entity_id, lang) {
  const blocchi = Array.isArray(blocks) ? blocks : []
  if (!blocchi.some(b => b?.type === 'eventi' || b?.type === 'eventi_slider')) return null
  const vuolePassati = blocchi.some(b => b?.type === 'eventi' && b.data?.mostra_passati !== false)
  try {
    const [prossimi, passati] = await Promise.all([
      eventiPubblici({ entity_tipo, entity_id, lang }),
      vuolePassati ? eventiPubblici({ entity_tipo, entity_id, lang, passati: true }) : { eventi: [] },
    ])
    if (prossimi.errore || passati.errore) return null
    return { prossimi: prossimi.eventi, passati: passati.eventi }
  } catch {
    return null
  }
}
