// Il calendario dei prezzi e delle restrizioni di una risorsa (migration 144).
//
//   GET  ?dal=YYYY-MM-DD&al=YYYY-MM-DD   → i giorni diversi dal prezzo base
//   POST { azione: 'imposta', dal, al, giorni?, valori }   modifica in blocco
//   POST { azione: 'azzera',  dal, al, giorni? }           torna al prezzo base
//   POST { azione: 'copia',   dal, al }                    copia sul prossimo anno
//
// Le «stagioni» sono questo: un modo di scrivere tanti giorni insieme. Il dato
// resta il giorno.
//
// ⚠️ Il recinto: `requireRecordAccess` sulla risorsa (è della tua azienda?) e
// tutte le scritture filtrano per `risorsa_id`. Quello che arriva dal browser
// dice quali giorni e quali valori, e ogni valore passa da un controllo chiuso.

import { supabaseAdmin } from '@/lib/supabase-server'
import { requireRecordAccess } from '@/lib/server-auth'

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_GIORNI = 400
const CAMPI = 'id, data, prezzo, minimo_notti, massimo_notti, chiuso_arrivo, chiuso_partenza, non_vendibile'

function dataValida(s) {
  if (typeof s !== 'string' || !DATA_RE.test(s)) return false
  const d = new Date(`${s}T12:00:00Z`)
  // regola-ok: controllo di formato su un giorno puro, nessun fuso coinvolto.
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

function giornoDopo(g, n = 1) {
  const d = new Date(`${g}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  // regola-ok: aritmetica su giorni puri, a mezzogiorno UTC lontano dai bordi.
  return d.toISOString().slice(0, 10)
}

function giornoSettimana(g) {
  return new Date(`${g}T12:00:00Z`).getUTCDay()
}

// I giorni fra dal e al compresi, eventualmente solo alcuni della settimana.
function giorniDelPeriodo(dal, al, giorni) {
  const soloAlcuni = Array.isArray(giorni) && giorni.length
  const out = []
  for (let g = dal; g <= al && out.length <= MAX_GIORNI; g = giornoDopo(g)) {
    if (!soloAlcuni || giorni.includes(giornoSettimana(g))) out.push(g)
  }
  return out
}

function periodoValido(dal, al) {
  if (!dataValida(dal) || !dataValida(al)) return 'Date non valide.'
  if (al < dal) return 'La data di fine viene prima di quella di inizio.'
  const giorni = Math.round((new Date(`${al}T12:00:00Z`) - new Date(`${dal}T12:00:00Z`)) / 86400000) + 1
  if (giorni > MAX_GIORNI) return `Al massimo ${MAX_GIORNI} giorni per volta.`
  return null
}

// I valori ammessi, uno per uno. `null` = togli questa regola (torna quella
// della risorsa); una chiave assente = non toccarla.
function valoriPuliti(v) {
  if (!v || typeof v !== 'object') return { errore: 'Nessun valore da impostare.' }
  const out = {}
  if ('prezzo' in v) {
    if (v.prezzo === null || v.prezzo === '') out.prezzo = null
    else {
      const n = Number(v.prezzo)
      if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return { errore: 'Prezzo non valido.' }
      out.prezzo = Math.round(n * 100) / 100
    }
  }
  for (const k of ['minimo_notti', 'massimo_notti']) {
    if (!(k in v)) continue
    if (v[k] === null || v[k] === '') { out[k] = null; continue }
    const n = Number(v[k])
    if (!Number.isInteger(n) || n < 0 || n > 365) return { errore: 'Durata non valida.' }
    out[k] = n
  }
  for (const k of ['chiuso_arrivo', 'chiuso_partenza', 'non_vendibile']) {
    if (!(k in v)) continue
    if (typeof v[k] !== 'boolean') return { errore: 'Valore non valido.' }
    out[k] = v[k]
  }
  if (!Object.keys(out).length) return { errore: 'Nessun valore da impostare.' }
  return { valori: out }
}

// Una riga che non dice più niente si cancella: la tabella resta sparsa, e un
// giorno senza riga vale il prezzo base.
function rigaVuota(r) {
  return r.prezzo == null && r.minimo_notti == null && r.massimo_notti == null &&
    !r.chiuso_arrivo && !r.chiuso_partenza && !r.non_vendibile
}

async function righeEsistenti(risorsaId, dal, al) {
  const { data, error } = await supabaseAdmin.from('risorse_tariffe').select(CAMPI)
    .eq('risorsa_id', risorsaId).is('ora_inizio', null)
    .gte('data', dal).lte('data', al).order('data')
  if (error) throw error
  return data || []
}

// Scrive le righe finali di un insieme di giorni: aggiorna, inserisce, cancella.
async function scrivi(risorsaId, finali, esistenti) {
  const perData = Object.fromEntries(esistenti.map(r => [r.data, r]))
  const daCancellare = [], daAggiornare = [], daInserire = []
  const adesso = new Date().toISOString()
  for (const r of finali) {
    const prima = perData[r.data]
    if (rigaVuota(r)) { if (prima) daCancellare.push(prima.id); continue }
    const riga = {
      risorsa_id: risorsaId, data: r.data,
      prezzo: r.prezzo ?? null, minimo_notti: r.minimo_notti ?? null, massimo_notti: r.massimo_notti ?? null,
      chiuso_arrivo: !!r.chiuso_arrivo, chiuso_partenza: !!r.chiuso_partenza, non_vendibile: !!r.non_vendibile,
      updated_at: adesso,
    }
    if (prima) daAggiornare.push({ id: prima.id, ...riga })
    else daInserire.push(riga)
  }
  if (daAggiornare.length) {
    const { error } = await supabaseAdmin.from('risorse_tariffe').upsert(daAggiornare, { onConflict: 'id' })
    if (error) throw error
  }
  if (daInserire.length) {
    const { error } = await supabaseAdmin.from('risorse_tariffe').insert(daInserire)
    if (error) throw error
  }
  if (daCancellare.length) {
    const { error } = await supabaseAdmin.from('risorse_tariffe').delete()
      .eq('risorsa_id', risorsaId).in('id', daCancellare)
    if (error) throw error
  }
  return { aggiornati: daAggiornare.length, inseriti: daInserire.length, tolti: daCancellare.length }
}

export async function GET(request, props) {
  const params = await props.params
  try {
    const { response } = await requireRecordAccess(request, 'risorse', params.id)
    if (response) return response
    const { searchParams } = new URL(request.url)
    const dal = searchParams.get('dal'), al = searchParams.get('al')
    const errore = periodoValido(dal, al)
    if (errore) return Response.json({ error: errore }, { status: 400 })
    return Response.json({ giorni: await righeEsistenti(params.id, dal, al) })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request, props) {
  const params = await props.params
  try {
    const { response } = await requireRecordAccess(request, 'risorse', params.id)
    if (response) return response
    const body = await request.json().catch(() => null)
    if (!body) return Response.json({ error: 'Richiesta non valida' }, { status: 400 })
    const { azione, dal, al } = body
    const errore = periodoValido(dal, al)
    if (errore) return Response.json({ error: errore }, { status: 400 })

    const giorniSett = Array.isArray(body.giorni)
      ? [...new Set(body.giorni.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 6))]
      : null

    if (azione === 'imposta' || azione === 'azzera') {
      let valori = null
      if (azione === 'imposta') {
        const v = valoriPuliti(body.valori)
        if (v.errore) return Response.json({ error: v.errore }, { status: 400 })
        valori = v.valori
      }
      const giorni = giorniDelPeriodo(dal, al, giorniSett)
      const esistenti = await righeEsistenti(params.id, dal, al)
      const perData = Object.fromEntries(esistenti.map(r => [r.data, r]))
      const finali = giorni.map(data => azione === 'azzera'
        ? { data }
        : { ...(perData[data] || {}), data, ...valori })
      return Response.json({ ok: true, giorni: giorni.length, ...(await scrivi(params.id, finali, esistenti)) })
    }

    // Copia sul prossimo anno, **allineata alla settimana**: si sposta di 364
    // giorni (52 settimane), così un sabato resta un sabato — il prezzo del
    // weekend finisce sul weekend. Le feste a data fissa (Natale) slittano di un
    // giorno, quelle mobili (Pasqua) vanno comunque riviste: lo dice il pannello.
    if (azione === 'copia') {
      const origine = await righeEsistenti(params.id, dal, al)
      if (!origine.length) return Response.json({ error: 'In quel periodo non c\'è niente da copiare.' }, { status: 400 })
      const nuovoDal = giornoDopo(dal, 364), nuovoAl = giornoDopo(al, 364)
      const esistenti = await righeEsistenti(params.id, nuovoDal, nuovoAl)
      const finali = origine.map(({ id, data, ...r }) => ({ ...r, data: giornoDopo(data, 364) }))
      return Response.json({ ok: true, dal: nuovoDal, al: nuovoAl, ...(await scrivi(params.id, finali, esistenti)) })
    }

    return Response.json({ error: 'Azione non valida' }, { status: 400 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
