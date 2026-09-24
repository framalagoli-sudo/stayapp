import { supabaseAdmin } from '@/lib/supabase-server'
import { rimuoviDominiEntita } from '@/lib/domini-manutenzione'
import { logError } from '@/lib/observability'

// Cancellare un'azienda, o una sua entità, porta via tutto.
//
// Il database porta via da solo le righe (chiavi esterne in cascata, migration
// 127). Qui c'è ciò che il database non raggiunge:
//  · gli ACCOUNT delle persone, che vivono in auth.users: prima restavano vivi e
//    capaci di fare login, senza più un'azienda — è così che i collaboratori di
//    Futura Vacanze erano ancora lì una settimana dopo;
//  · i FILE caricati, che restavano pubblicati al loro indirizzo;
//  · le TRADUZIONI, la cui tabella indica entità, pagine, eventi, articoli e form
//    con la stessa colonna, e quindi non può avere una chiave esterna.
//
// L'ordine è quello che non lascia mai un cliente a metà:
//   1. si RACCOGLIE cosa togliere (sola lettura: dopo la cascata gli id non si
//      trovano più);
//   2. si cancella la RIGA — se fallisce, non si è perso niente;
//   3. solo allora si tolgono file, traduzioni e account.
//
// Prova dal vivo: tests/probe-cancella-azienda.mjs e probe-cancella-entita-altrui.mjs.

const BUCKET = 'property-media'
const MARCA_BUCKET = `/storage/v1/object/public/${BUCKET}/`

// Tutte le cartelle in cui il caricamento scrive i file di un'entità. Sono
// cinque per ragioni storiche (vedi le route in app/api/upload e app/api/media).
const cartelleEntita = (id) => [id, `struttura/${id}`, `ristorante/${id}`, `attivita/${id}`, `ristoranti/${id}`]

// I file del blog stanno in una cartella comune: si riconoscono solo dagli
// indirizzi scritti negli articoli. Si tolgono SOLO quelli sotto `blog/`: un
// indirizzo che punta altrove può essere condiviso, e non è questo il posto per
// deciderlo.
function fileDelBlog(articoli) {
  const testo = JSON.stringify(articoli)
  const trovati = new Set()
  for (let i = testo.indexOf(MARCA_BUCKET); i >= 0; i = testo.indexOf(MARCA_BUCKET, i + 1)) {
    const percorso = decodeURIComponent(testo.slice(i + MARCA_BUCKET.length).split(/["?\s\\)]/)[0])
    if (percorso.startsWith('blog/') && !percorso.includes('..')) trovati.add(percorso)
  }
  return [...trovati]
}

async function svuotaCartella(cartella, errori) {
  for (;;) {
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).list(cartella, { limit: 1000 })
    if (error) { errori.push(`file in ${cartella}: ${error.message}`); return }
    // `list` restituisce anche le sottocartelle, come voci senza id.
    const file = (data || []).filter(f => f.id).map(f => `${cartella}/${f.name}`)
    if (!file.length) return
    const { error: rErr } = await supabaseAdmin.storage.from(BUCKET).remove(file)
    if (rErr) { errori.push(`file in ${cartella}: ${rErr.message}`); return }
    if (file.length < 1000) return
  }
}

// ── 1. Raccogliere ──────────────────────────────────────────────────────────
async function pianoEntita(entityIds) {
  if (!entityIds.length) return { traduzioni: [], cartelle: [], file: [], utenti: [] }
  const { data: pagine, error } = await supabaseAdmin.from('pagine').select('id').in('entity_id', entityIds)
  if (error) throw new Error(`pagine: ${error.message}`)
  return {
    traduzioni: [...entityIds, ...(pagine || []).map(p => p.id)],
    cartelle: entityIds.flatMap(cartelleEntita),
    file: [],
    utenti: [],
  }
}

async function pianoAzienda(aziendaId) {
  const letture = await Promise.all([
    supabaseAdmin.from('entita').select('id').eq('azienda_id', aziendaId),
    supabaseAdmin.from('properties').select('id').eq('azienda_id', aziendaId),
    supabaseAdmin.from('ristoranti').select('id').eq('azienda_id', aziendaId),
    supabaseAdmin.from('attivita').select('id').eq('azienda_id', aziendaId),
    supabaseAdmin.from('eventi').select('id').eq('azienda_id', aziendaId),
    supabaseAdmin.from('articoli').select('*').eq('azienda_id', aziendaId),
    supabaseAdmin.from('form_builder').select('id').eq('azienda_id', aziendaId),
    supabaseAdmin.from('profiles').select('id, role').eq('azienda_id', aziendaId),
  ])
  const fallita = letture.find(r => r.error)
  if (fallita) throw new Error(fallita.error.message)
  const [ent, prop, rist, att, eventi, articoli, form, profili] = letture.map(r => r.data || [])

  // Le righe storiche possono avere id propri: si prendono tutte.
  const piano = await pianoEntita([...new Set([...ent, ...prop, ...rist, ...att].map(r => r.id))])
  piano.traduzioni.push(...eventi.map(e => e.id), ...articoli.map(a => a.id), ...form.map(f => f.id))
  piano.cartelle.push(...eventi.map(e => `eventi/${e.id}`), `prodotto/${aziendaId}`)
  piano.file = fileDelBlog(articoli)
  // Il super_admin non ha azienda, ma il filtro resta: non deve esistere una
  // strada per cui cancellare un cliente porti via la chiave della piattaforma.
  piano.utenti = profili.filter(p => p.role !== 'super_admin').map(p => p.id)
  return piano
}

// ── 3. Togliere ciò che il database non raggiunge ───────────────────────────
// Ogni passo prova anche se il precedente è fallito: la riga è già cancellata,
// e lasciare di più perché una cosa è andata storta sarebbe il contrario di
// quello che serve. Gli errori tornano indietro e finiscono negli allarmi.
async function eseguiPiano(piano, contesto) {
  const errori = []
  if (piano.traduzioni.length) {
    const { error } = await supabaseAdmin.from('entity_translations').delete().in('entity_id', piano.traduzioni)
    if (error) errori.push(`traduzioni: ${error.message}`)
  }
  for (const c of piano.cartelle) await svuotaCartella(c, errori)
  for (let i = 0; i < piano.file.length; i += 100) {
    const { error } = await supabaseAdmin.storage.from(BUCKET).remove(piano.file.slice(i, i + 100))
    if (error) errori.push(`file del blog: ${error.message}`)
  }
  // Il profilo se ne va da solo (profiles.id → auth.users in cascata).
  for (const id of piano.utenti) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (error && !/not.?found/i.test(error.message)) errori.push(`account ${id}: ${error.message}`)
  }
  if (errori.length) logError('cancellazione', new Error(`${contesto}: ${errori.join(' · ')}`), { alert: true })
  return errori
}

// Una route che cancella UNA entità toglie anche la sua riga storica, se c'è:
// nessuno ci scrive più, ma ci sono dentro, per esempio, le credenziali del
// WiFi. Va DOPO l'entità: il trigger della 081 sulla riga storica cancella
// anche l'entità con lo stesso id.
async function cancellaRigheStoriche(entityId) {
  for (const t of ['properties', 'ristoranti', 'attivita']) {
    await supabaseAdmin.from(t).delete().eq('id', entityId)
  }
}

// ── Le due porte ────────────────────────────────────────────────────────────

// Cancella UNA entità, con tutto quello che le appartiene.
//
// ⛔ Il controllo di proprietà viene PRIMA di qualunque effetto. Fino al
// 24/09/2026 le route cancellavano con un filtro per azienda (0 righe, nessun
// errore, se l'entità era di un altro) e poi staccavano comunque i domini
// dell'id ricevuto: l'admin di un'azienda poteva mandare offline il sito di
// un'altra, e riceveva un 200. Una cancellazione filtrata che non trova
// niente non è un rifiuto: il rifiuto va chiesto esplicitamente.
//
// Il ruolo lo controlla la route (ogni tipo ha i suoi): qui si decide «è sua?».
export async function cancellaEntita(tipo, id, profile) {
  let q = supabaseAdmin.from('entita').select('id').eq('tipo', tipo).eq('id', id)
  if (profile.role !== 'super_admin') {
    if (!profile.azienda_id) return { status: 404, error: 'Non trovata' }
    q = q.eq('azienda_id', profile.azienda_id)
  }
  const { data: ent, error: eLettura } = await q.maybeSingle()
  if (eLettura) return { status: 500, error: eLettura.message }
  if (!ent) return { status: 404, error: 'Non trovata' }

  let piano
  try { piano = await pianoEntita([id]) }
  catch (e) { return { status: 500, error: `Lettura fallita, niente è stato cancellato: ${e.message}` } }

  const { error } = await supabaseAdmin.from('entita').delete().eq('id', id)
  if (error) return { status: 500, error: error.message }

  // Gli indirizzi che non si staccano restano segnati «da rimuovere» e li
  // riprende la manutenzione (lib/domini-manutenzione.js).
  await rimuoviDominiEntita(tipo, id)
  await cancellaRigheStoriche(id)
  const errori = await eseguiPiano(piano, `entità ${id}`)
  return { ok: true, avvisi: errori }
}

// Cancella un'azienda, con entità, utenti, dati e file. Solo per il super_admin:
// il controllo lo fa la route. Gli indirizzi web li stacca la route PRIMA
// (rimuoviDominiAzienda), perché se uno non si stacca l'azienda non va toccata.
export async function cancellaAzienda(aziendaId) {
  let piano
  try { piano = await pianoAzienda(aziendaId) }
  catch (e) { return { status: 500, error: `Lettura fallita, niente è stato cancellato: ${e.message}` } }

  const { error } = await supabaseAdmin.from('aziende').delete().eq('id', aziendaId)
  if (error) return { status: 500, error: `L'azienda non è stata cancellata: ${error.message}` }

  const errori = await eseguiPiano(piano, `azienda ${aziendaId}`)
  return { ok: true, avvisi: errori }
}
