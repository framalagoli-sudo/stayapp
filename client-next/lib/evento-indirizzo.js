import { supabaseAdmin } from './supabase-server'

// Come si arriva a un evento dal suo indirizzo.
//
// Un evento si apre con un indirizzo parlante — `/eventi/cena-di-natale` — ma
// tre strade portano allo stesso posto, e vanno tutte tenute aperte:
//   · lo **slug attuale**: l'indirizzo buono, quello che va nella sitemap;
//   · un **id**: com'erano tutti i link fino al 12/09/2026, e come sono ancora
//     nei post già pubblicati e nelle inserzioni pagate;
//   · uno **slug vecchio**: l'indirizzo che l'evento aveva prima che il cliente
//     lo cambiasse.
//
// Le ultime due rispondono, ma dicono anche «non sono io»: chi chiama manda un
// redirect permanente verso lo slug attuale, così il valore per i motori di
// ricerca si concentra su un indirizzo solo invece di spargersi su tre.
//
// ⚠️ Un posto solo: la pagina e la route API devono rispondere alle stesse
// domande allo stesso modo, altrimenti un indirizzo funziona e l'altro no.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function sembraUnId(valore) {
  return UUID_RE.test(String(valore || ''))
}

// Da un titolo (o da quello che il cliente scrive nel campo) a un indirizzo.
// Solo lettere, numeri e trattini: quello che finisce in un URL non può
// contenere spazi, accenti o qualunque cosa arrivi dalla tastiera.
export function slugEvento(testo) {
  return String(testo || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    .slice(0, 80)
}

// Lo slug è unico fra TUTTI gli eventi (vincolo del database dalla 015): se è
// già preso si aggiunge un suffisso, come si fa da sempre per le entità.
// `escludi` è l'evento che stiamo modificando: il suo slug attuale non è un
// conflitto con sé stesso.
export async function slugLibero(base, escludi = null) {
  const pulito = base || 'evento'
  let candidato = pulito
  for (let n = 0; n < 50; n++) {
    let q = supabaseAdmin.from('eventi').select('id').eq('slug', candidato)
    if (escludi) q = q.neq('id', escludi)
    const { data } = await q.maybeSingle()
    if (!data) return candidato
    candidato = `${pulito}-${(n + 1).toString(36)}`
  }
  return `${pulito}-${Date.now().toString(36)}`
}

/**
 * Trova un evento pubblicato dal suo indirizzo.
 *
 * @param {string} indirizzo  slug attuale, id, o slug di un tempo
 * @param {string} campi      le colonne da leggere (elencate dal chiamante:
 *                            questa funzione serve anche le pagine pubbliche)
 * @returns {{ evento: object|null, indirizzoGiusto: string|null }}
 *          `indirizzoGiusto` è valorizzato **solo** quando chi ha chiesto è
 *          arrivato da un indirizzo diverso da quello attuale: è il segnale
 *          che va mandato un redirect.
 */
export async function trovaEvento(indirizzo, campi) {
  const chiave = String(indirizzo || '').trim()
  if (!chiave) return { evento: null, indirizzoGiusto: null }

  const base = () => supabaseAdmin.from('eventi').select(campi)
    .eq('published', true).eq('active', true)

  if (sembraUnId(chiave)) {
    const { data } = await base().eq('id', chiave).maybeSingle()
    // Un evento senza slug non esiste (la colonna è obbligatoria dal 2026), ma
    // se mai capitasse l'id resta un indirizzo valido: meglio una pagina che
    // funziona con un indirizzo brutto che un 404.
    return { evento: data || null, indirizzoGiusto: data?.slug || null }
  }

  const { data } = await base().eq('slug', chiave).maybeSingle()
  if (data) return { evento: data, indirizzoGiusto: null }

  // Un indirizzo che questo evento aveva prima. La colonna arriva con la
  // migration 114: finché non è stata eseguita la query fallisce, e questo
  // ramo deve solo non trovare niente — non far cadere la pagina.
  try {
    const { data: vecchio, error } = await base()
      .contains('slug_precedenti', [chiave]).maybeSingle()
    if (error) return { evento: null, indirizzoGiusto: null }
    if (vecchio) return { evento: vecchio, indirizzoGiusto: vecchio.slug }
  } catch { /* migration non ancora eseguita */ }

  return { evento: null, indirizzoGiusto: null }
}
