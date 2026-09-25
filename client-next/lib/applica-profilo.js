import { supabaseAdmin } from '@/lib/supabase-server'
import { FUNZIONI, FUNZIONI_AZIENDA } from '@/lib/funzioni'
import { usoDiUna } from '@/lib/uso-funzioni'

// Applicare una categoria (profilo di mestiere) a un'entità.
//
// Deciso da Francesco il 24/09 (STRATEGIA.md §6.1): le funzioni le accendiamo
// noi per categoria, e la categoria sta sull'entità. Il profilo si applica COME
// COPIA: le sue funzioni finiscono negli interruttori dell'entità, e quelle di
// livello azienda in `aziende.funzioni`. Il sito pubblico e l'app del QR
// continuano a leggere quello che leggevano; cambiare un profilo non tocca
// nessun cliente finché non lo si riapplica apposta.
//
// ⚠️ Tre cose che questa funzione NON fa, di proposito:
//  · non tocca le chiavi di `moduli` che non sono funzioni del catalogo
//    (wifi, reception, pwa_active, allergens, active…): le usano le app del QR;
//  · non spegne una funzione che ha contenuti (un menù scritto, una vetrina
//    con elementi): spegnerla toglierebbe quel contenuto dal sito e dall'app
//    del cliente. La lascia accesa e lo dice nell'esito;
//  · non controlla chi chiede: lo fa la route, solo super_admin.

const SCEGLIBILI = FUNZIONI.filter(f => !f.sempre)
const quanti = (x) => (Array.isArray(x) ? x.length : x && typeof x === 'object' ? Object.keys(x).length : 0)

// Cosa c'è dentro, funzione per funzione: è ciò che non si deve far sparire.
async function contenutiDi(ent) {
  const [{ count: offerte }, { count: vetrine }] = await Promise.all([
    supabaseAdmin.from('offerte').select('*', { count: 'exact', head: true }).eq('entity_id', ent.id),
    supabaseAdmin.from('vetrine').select('*', { count: 'exact', head: true }).eq('entity_id', ent.id),
  ])
  return {
    menu: quanti(ent.menu),
    servizi: quanti(ent.services),
    galleria: quanti(ent.gallery),
    offerte: offerte || 0,
    vetrine: vetrine || 0,
  }
}

// Scrive un interruttore dove lo leggono tutti: in cima, dentro `modules` se
// c'è (le attività li tengono lì, e lì dentro vincono), e sotto i nomi storici
// già presenti (`gallery` per `galleria`…), perché qualche lettore vecchio li
// legge direttamente.
function scrivi(moduli, f, valore) {
  moduli[f.chiave] = valore
  const annidati = moduli.modules && typeof moduli.modules === 'object' ? moduli.modules : null
  if (annidati) annidati[f.chiave] = valore
  for (const a of f.alias || []) {
    if (a in moduli) moduli[a] = valore
    if (annidati && a in annidati) annidati[a] = valore
  }
}

// Le funzioni di livello azienda sono l'unione di quelle delle sue entità — ma
// solo se TUTTE hanno una categoria. Finché ne manca una, l'azienda vede tutto:
// nascondere a Borgo del Lago le funzioni della struttura perché si è assegnato
// solo il ristorante sarebbe un errore silenzioso.
//
// A quelle si aggiungono le funzioni che l'azienda HA USATO (righe nel database,
// lib/uso-funzioni.js): spegnere dal menu il blog di chi ha scritto un articolo
// è far sparire una cosa sua, come il 29/08 con «Risorse». Stessa regola delle
// funzioni dell'entità con contenuti.
async function ricalcolaAzienda(aziendaId) {
  const { data: entita, error } = await supabaseAdmin.from('entita').select('profilo').eq('azienda_id', aziendaId)
  if (error) throw new Error(error.message)
  let funzioni = null
  const tenute = []
  if (entita.length && entita.every(e => e.profilo)) {
    const chiavi = [...new Set(entita.map(e => e.profilo))]
    const { data: profili, error: pErr } = await supabaseAdmin.from('profili_mestiere').select('funzioni_azienda').in('chiave', chiavi)
    if (pErr) throw new Error(pErr.message)
    funzioni = {}
    for (const p of profili) for (const [k, v] of Object.entries(p.funzioni_azienda || {})) if (v) funzioni[k] = true
    const uso = await usoDiUna(aziendaId)
    for (const f of FUNZIONI_AZIENDA) {
      if (funzioni[f.chiave] || !uso[f.chiave]) continue
      funzioni[f.chiave] = true
      tenute.push({ funzione: f.titolo, contenuti: uso[f.chiave] })
    }
  }
  const { error: uErr } = await supabaseAdmin.from('aziende').update({ funzioni }).eq('id', aziendaId)
  if (uErr) throw new Error(uErr.message)
  return { funzioni, tenute }
}

// Applica `chiave` (o nessuna categoria, se null) all'entità.
// Restituisce cosa è cambiato, per mostrarlo a chi l'ha fatto.
export async function applicaProfilo(entityId, chiave) {
  const { data: ent, error } = await supabaseAdmin.from('entita')
    .select('id, azienda_id, tipo, name, moduli, menu, services, gallery').eq('id', entityId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!ent) return { errore: 'Entità non trovata', status: 404 }

  if (chiave === null) {
    const { error: uErr } = await supabaseAdmin.from('entita').update({ profilo: null, profilo_versione: null }).eq('id', entityId)
    if (uErr) throw new Error(uErr.message)
    const { tenute: tenuteAzienda } = await ricalcolaAzienda(ent.azienda_id)
    return { entita: ent.name, profilo: null, accese: [], spente: [], tenute: [], tenuteAzienda }
  }

  const { data: profilo, error: pErr } = await supabaseAdmin.from('profili_mestiere')
    .select('chiave, nome, versione, funzioni_entita').eq('chiave', chiave).maybeSingle()
  if (pErr) throw new Error(pErr.message)
  if (!profilo) return { errore: 'Categoria non trovata', status: 404 }

  const contenuti = await contenutiDi(ent)
  const moduli = structuredClone(ent.moduli && typeof ent.moduli === 'object' ? ent.moduli : {})
  const accese = [], spente = [], tenute = []
  for (const f of SCEGLIBILI) {
    const vuole = !!profilo.funzioni_entita?.[f.chiave]
    if (!vuole && contenuti[f.chiave] > 0) {
      scrivi(moduli, f, true)
      tenute.push({ funzione: f.titolo, contenuti: contenuti[f.chiave] })
      continue
    }
    scrivi(moduli, f, vuole)
    ;(vuole ? accese : spente).push(f.titolo)
  }

  const { error: uErr } = await supabaseAdmin.from('entita')
    .update({ moduli, profilo: profilo.chiave, profilo_versione: profilo.versione }).eq('id', entityId)
  if (uErr) throw new Error(uErr.message)
  const { funzioni: funzioniAzienda, tenute: tenuteAzienda } = await ricalcolaAzienda(ent.azienda_id)
  return { entita: ent.name, profilo: profilo.nome, accese, spente, tenute, funzioniAzienda, tenuteAzienda }
}

// La categoria esiste? Serve alle route di creazione, per rifiutare PRIMA di
// creare l'entità una categoria sbagliata.
export async function categoriaEsiste(chiave) {
  if (typeof chiave !== 'string' || !/^[a-z0-9_]{2,40}$/.test(chiave)) return false
  const { data } = await supabaseAdmin.from('profili_mestiere').select('chiave').eq('chiave', chiave).maybeSingle()
  return !!data
}

// Subito dopo la creazione di un'entità. Con la categoria: si applica. Senza:
// l'azienda ha un'entità senza categoria, quindi torna a vedere tutto finché
// non gliene si dà una (è la regola di ricalcolaAzienda) — meglio che un menu
// filtrato su una categoria che l'entità nuova non ha.
export async function dopoLaNascita(entityId, aziendaId, profilo) {
  if (profilo) return applicaProfilo(entityId, profilo)
  await ricalcolaAzienda(aziendaId)
  return null
}
