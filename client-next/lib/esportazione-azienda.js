import { supabaseAdmin } from './supabase-server'

// L'esportazione dei dati di un'azienda (portabilità, art. 20 GDPR).
//
// ⛔ Prima era un elenco di 16 tabelle scritto a mano, su 67: offerte,
// preventivi, recensioni, moduli e risposte, pagine del sito, vetrine, negozio,
// newsletter… restavano fuori, e l'esportazione diceva di essere completa. È lo
// stesso difetto che il backup notturno ha già avuto (lib/backup.js): un elenco
// a mano invecchia in silenzio a ogni modulo nuovo.
//
// Qui non c'è elenco. Si legge lo schema che il database pubblica (PostgREST,
// con le chiavi esterne dichiarate) e si raccoglie tutto ciò che appartiene
// all'azienda:
//   1. ogni tabella con `azienda_id` = questa azienda;
//   2. poi si scende lungo le chiavi esterne (un evento → le sue prenotazioni,
//      un modulo → le sue risposte…) finché non si trova più niente di nuovo;
//   3. le colonne senza chiave dichiarata che indicano un'entità (`entity_id`,
//      `property_id`) si seguono verso le entità dell'azienda; quelle di
//      `entity_translations` puntano anche a pagine, eventi, articoli e moduli.
// Una tabella aggiunta domani entra da sola.
//
// 🔒 Una riga che ha un `azienda_id` DIVERSO non entra mai, anche se ci si
// arriva da un collegamento: è l'esportazione di un'azienda, non una porta
// verso le altre.

// Tabelle della piattaforma o nostre: non sono dati dell'azienda.
const FUORI = new Set([
  'rate_limits', 'platform_config', 'profili_mestiere', 'cron_battiti', 'groups',
  'club_contenuti', 'club_consigli', 'demo_requests', 'landing_seo',
  // il registro di sicurezza è nostro: dice chi ha fatto cosa, anche contro di loro
  'audit_log',
  // copie ferme di `entita` (nota 31): la verità è `entita`
  'properties', 'ristoranti', 'attivita',
])

// Chiavi d'accesso, non dati: un link di annullamento o di disiscrizione, il
// token di un modulo, il token WhatsApp cifrato. Restano oscurate.
const SEGRETA = /(^token$|_token$|cifrat|secret)/i

// Colonne che indicano un'entità ma non hanno una chiave esterna dichiarata.
const VERSO_ENTITA = ['entity_id', 'property_id']
// `entity_translations.entity_id` indica di tutto (nota 51).
const TRADUCIBILI = ['entita', 'pagine', 'eventi', 'articoli', 'form_builder', 'vetrine', 'sezioni', 'vetrina_elementi']

const BLOCCO = 1000          // PostgREST taglia a mille righe, in silenzio
const PEZZO = 100            // id per `.in()`: un URL troppo lungo fallisce

async function schema() {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
  const chiave = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').replace(/^﻿/, '').trim()
  const r = await fetch(`${base}/rest/v1/`, { headers: { apikey: chiave, Authorization: `Bearer ${chiave}` }, cache: 'no-store' })
  if (!r.ok) throw new Error(`schema del database non leggibile (${r.status})`)
  const defs = (await r.json()).definitions || {}
  const tabelle = {}
  for (const [nome, d] of Object.entries(defs)) {
    if (FUORI.has(nome)) continue
    const colonne = Object.keys(d.properties || {})
    const chiaviEsterne = []
    for (const [col, p] of Object.entries(d.properties || {})) {
      const m = String(p.description || '').match(/<fk table='([^']+)' column='([^']+)'\/>/)
      if (m) chiaviEsterne.push({ col, tabella: m[1], colonna: m[2] })
    }
    tabelle[nome] = { colonne, chiaviEsterne }
  }
  return tabelle
}

// Tutte le righe dove `col` sta fra i valori, a blocchi e a pezzi.
async function leggi(tabella, col, valori) {
  const righe = []
  for (let i = 0; i < valori.length; i += PEZZO) {
    const pezzo = valori.slice(i, i + PEZZO)
    for (let da = 0; ; da += BLOCCO) {
      const { data, error } = await supabaseAdmin.from(tabella).select('*').in(col, pezzo).range(da, da + BLOCCO - 1)
      if (error) throw new Error(`${tabella}.${col}: ${error.message}`)
      righe.push(...(data || []))
      if (!data || data.length < BLOCCO) break
    }
  }
  return righe
}

const chiaveRiga = r => (r.id != null ? String(r.id) : JSON.stringify(r))

export async function esportaAzienda(aziendaId) {
  const tabelle = await schema()
  const raccolte = {}          // tabella → Map(chiave → riga)
  const errori = {}
  const aggiungi = (tabella, righe) => {
    const m = raccolte[tabella] || (raccolte[tabella] = new Map())
    let nuove = 0
    for (const r of righe) {
      if ('azienda_id' in r && r.azienda_id && r.azienda_id !== aziendaId) continue   // 🔒
      const k = chiaveRiga(r)
      if (!m.has(k)) { m.set(k, r); nuove++ }
    }
    return nuove
  }
  const idsDi = tabella => [...(raccolte[tabella]?.values() || [])].map(r => r.id).filter(v => v != null)
  const prova = async (tabella, col, valori) => {
    if (!valori.length) return 0
    try { return aggiungi(tabella, await leggi(tabella, col, valori)) }
    catch (e) { errori[tabella] = e.message; return 0 }
  }

  // 1. L'azienda e tutto ciò che porta il suo id.
  await prova('aziende', 'id', [aziendaId])
  for (const [nome, t] of Object.entries(tabelle))
    if (t.colonne.includes('azienda_id')) await prova(nome, 'azienda_id', [aziendaId])

  // 2–3. Giù lungo i collegamenti, finché qualcosa di nuovo arriva.
  for (let giro = 0; giro < 6; giro++) {
    let nuove = 0
    for (const [nome, t] of Object.entries(tabelle)) {
      for (const fk of t.chiaviEsterne) {
        if (fk.tabella === nome || FUORI.has(fk.tabella)) continue
        const valori = [...(raccolte[fk.tabella]?.values() || [])].map(r => r[fk.colonna]).filter(v => v != null)
        nuove += await prova(nome, fk.col, [...new Set(valori.map(String))])
      }
      for (const col of VERSO_ENTITA) {
        if (!t.colonne.includes(col) || t.chiaviEsterne.some(f => f.col === col)) continue
        const verso = nome === 'entity_translations' ? TRADUCIBILI.flatMap(idsDi) : idsDi('entita')
        nuove += await prova(nome, col, [...new Set(verso.map(String))])
      }
    }
    if (!nuove) break
  }

  const tables = {}, counts = {}
  for (const nome of Object.keys(tabelle).sort()) {
    if (errori[nome]) { tables[nome] = { error: errori[nome] }; counts[nome] = `ERRORE: ${errori[nome]}`; continue }
    const righe = [...(raccolte[nome]?.values() || [])].map(r => {
      const pulita = { ...r }
      for (const c of Object.keys(pulita)) if (SEGRETA.test(c) && pulita[c] != null) pulita[c] = '[oscurato]'
      return pulita
    })
    if (!righe.length) continue
    tables[nome] = righe
    counts[nome] = righe.length
  }
  return { tables, counts, errori }
}
