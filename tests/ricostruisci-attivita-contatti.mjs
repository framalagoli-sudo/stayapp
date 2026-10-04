// Ricostruisce la storia dei contatti che c'erano PRIMA del registro (migration 130).
//
// Da quando esiste `contatti_attivita`, ogni porta scrive cosa ha fatto la
// persona. Ma chi era già fra i contatti ha la sua storia sparsa in altre
// tabelle — prenotazioni di eventi, di risorse e offerte, invii di moduli — o
// soltanto nel campo `fonte`. Qui la si rilegge da lì e la si scrive nel registro.
//
// Cosa fa, in ordine:
//   1. dà a ogni contatto la chiave del telefono (forma internazionale);
//   2. per ogni prenotazione o invio trova il contatto (email, poi telefono)
//      e scrive la riga; se il contatto non c'è, lo CREA — «devono entrare
//      tutti in contatti» (Francesco, 04/10/2026) — senza iscriverlo a niente;
//   3. a chi resta senza storia (arrivato dal modulo del sito o dalla
//      newsletter, dove non c'è una riga da cui ripartire) ne scrive una dalla
//      provenienza, con la data in cui è entrato.
//
// ⚠️ SIMULA soltanto: stampa cosa scriverebbe. Scrive solo con `--esegui`.
// Si può rilanciare: la stessa riga non entra due volte (indice unico su
// contatto + tipo + riferimento).
//
// Uso: cd tests && node ricostruisci-attivita-contatti.mjs            (simula)
//      cd tests && node ricostruisci-attivita-contatti.mjs --esegui   (scrive)
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.test', quiet: true })
const a = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const ESEGUI = process.argv.includes('--esegui')

// La stessa regola di `client-next/lib/contatti-import.js` (`normalizzaTelefono`):
// ricopiata perché quel file non si importa da qui. Se cambia là, cambia qui.
function normalizzaTelefono(raw, prefisso = '39') {
  if (!raw) return null
  let n = String(raw).replace(/[\s\-(). ]/g, '')
  if (n.startsWith('00')) n = '+' + n.slice(2)
  if (!n.startsWith('+')) {
    if (/^3\d{8,9}$/.test(n) || /^0\d{8,10}$/.test(n)) n = `+${prefisso}${n}`
    else if (/^\d{11,15}$/.test(n)) n = `+${n}`
    else return null
  }
  return /^\+\d{8,15}$/.test(n) ? n : null
}

// Tutte le righe di una tabella, a pagine: PostgREST ne dà mille per volta.
async function tutte(tabella, colonne) {
  const out = []
  for (let da = 0; ; da += 1000) {
    const { data, error } = await a.from(tabella).select(colonne).order('created_at').range(da, da + 999)
    if (error) throw new Error(`${tabella}: ${error.message}`)
    out.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return out
}

const aziende = await tutte('aziende', 'id, ragione_sociale, created_at')
const nomeAz = Object.fromEntries(aziende.map(z => [z.id, z.ragione_sociale]))
// Le aziende ZZ sono quelle che le sonde creano e cancellano: se una gira
// mentre si ricostruisce, i suoi contatti spariscono a metà lavoro. Si saltano.
const diProva = new Set(aziende.filter(z => (z.ragione_sociale || '').startsWith('ZZ-')).map(z => z.id))
const contatti = (await tutte('contatti', 'id, azienda_id, nome, email, telefono, telefono_e164, fonte, tags, attivita_numero, created_at')).filter(c => !diProva.has(c.azienda_id))
const esistenti = new Set((await tutte('contatti_attivita', 'contatto_id, tipo, riferimento, created_at')).map(r => `${r.contatto_id}|${r.tipo}|${r.riferimento}`))

// ── 1. La chiave del telefono ────────────────────────────────────────────────
const chiavi = contatti.filter(c => c.telefono && !c.telefono_e164).map(c => ({ id: c.id, e164: normalizzaTelefono(c.telefono), telefono: c.telefono }))
const conChiave = chiavi.filter(x => x.e164), senzaChiave = chiavi.filter(x => !x.e164)
for (const x of conChiave) contatti.find(c => c.id === x.id).telefono_e164 = x.e164

// Gli indici per riconoscere la persona: per azienda, per email e per numero.
const perEmail = new Map(), perTel = new Map()
const indicizza = c => {
  if (c.email) { const k = `${c.azienda_id}|${c.email.trim().toLowerCase()}`; if (!perEmail.has(k)) perEmail.set(k, c) }
  if (c.telefono_e164) { const k = `${c.azienda_id}|${c.telefono_e164}`; if (!perTel.has(k)) perTel.set(k, c) }
}
contatti.forEach(indicizza)

const daCreare = []    // contatti che mancano
const righe = []       // righe del registro
const perAzienda = {}
const segna = (az, cosa) => { const k = nomeAz[az] || '(azienda cancellata)'; (perAzienda[k] ||= {}); perAzienda[k][cosa] = (perAzienda[k][cosa] || 0) + 1 }

function contattoDi(aziendaId, { email, telefono, nome, fonte, quando }) {
  const mail = String(email || '').trim().toLowerCase() || null
  const e164 = normalizzaTelefono(telefono)
  if (!aziendaId || (!mail && !e164)) return null
  let c = (mail && perEmail.get(`${aziendaId}|${mail}`)) || (e164 && perTel.get(`${aziendaId}|${e164}`)) || null
  if (!c) {
    c = { _nuovo: true, _chiave: `nuovo-${daCreare.length}`, azienda_id: aziendaId, email: mail, nome: String(nome || '').trim() || mail || telefono,
      telefono: String(telefono || '').trim() || null, telefono_e164: e164, fonte, created_at: quando }
    daCreare.push(c); indicizza(c); segna(aziendaId, 'contatti da creare')
  }
  return c
}
function riga(c, aziendaId, r) {
  if (!c) return
  if (!c._nuovo && esistenti.has(`${c.id}|${r.tipo}|${r.riferimento}`)) return
  righe.push({ _contatto: c, azienda_id: aziendaId, ...r })
  segna(aziendaId, `registro: ${r.tipo}`)
}

// ── 2. Eventi ────────────────────────────────────────────────────────────────
const eventi = new Map((await tutte('eventi', 'id, title, azienda_id, entity_id, created_at')).map(e => [e.id, e]))
for (const b of await tutte('event_bookings', 'id, event_id, guest_name, guest_email, guest_phone, seats, status, created_at')) {
  const ev = eventi.get(b.event_id); if (!ev || diProva.has(ev.azienda_id)) continue
  const c = contattoDi(ev.azienda_id, { email: b.guest_email, telefono: b.guest_phone, nome: b.guest_name, fonte: 'evento', quando: b.created_at })
  if (!c) { segna(ev.azienda_id, 'prenotazioni senza recapito (restano fuori)'); continue }
  riga(c, ev.azienda_id, { tipo: b.status === 'waitlist' ? 'lista_attesa' : 'evento', titolo: ev.title, origine_id: ev.id, riferimento: b.id, entity_id: ev.entity_id, dettaglio: { posti: b.seats || 1 }, avvenuta_il: b.created_at })
}

// ── 3. Risorse e offerte ─────────────────────────────────────────────────────
const risorse = new Map((await tutte('risorse', 'id, nome, created_at')).map(r => [r.id, r]))
const offerte = new Map((await tutte('offerte', 'id, titolo, created_at')).map(o => [o.id, o]))
for (const p of await tutte('prenotazioni', 'id, azienda_id, entity_id, risorsa_id, offerta_id, cliente_nome, cliente_email, cliente_telefono, n_persone, created_at')) {
  if (diProva.has(p.azienda_id)) continue
  const c = contattoDi(p.azienda_id, { email: p.cliente_email, telefono: p.cliente_telefono, nome: p.cliente_nome, fonte: 'prenotazione', quando: p.created_at })
  if (!c) { segna(p.azienda_id, 'prenotazioni senza recapito (restano fuori)'); continue }
  const cosa = p.offerta_id ? offerte.get(p.offerta_id) : risorse.get(p.risorsa_id)
  riga(c, p.azienda_id, { tipo: 'prenotazione', titolo: cosa?.titolo || cosa?.nome || 'Prenotazione', origine_id: p.offerta_id || p.risorsa_id, riferimento: p.id, entity_id: p.entity_id, dettaglio: { persone: p.n_persone || 1 }, avvenuta_il: p.created_at })
}

// ── 4. Moduli ────────────────────────────────────────────────────────────────
const moduli = new Map((await tutte('form_builder', 'id, nome, created_at')).map(f => [f.id, f]))
const perId = new Map(contatti.map(c => [c.id, c]))
for (const s of await tutte('form_submissions', 'id, form_id, azienda_id, contatto_id, created_at')) {
  const c = perId.get(s.contatto_id)
  if (!c) { segna(s.azienda_id, 'invii di moduli senza contatto (restano fuori)'); continue }
  riga(c, c.azienda_id, { tipo: 'modulo', titolo: moduli.get(s.form_id)?.nome || 'Modulo', origine_id: s.form_id, riferimento: s.id, avvenuta_il: s.created_at })
}

// ── 5. Chi resta senza storia: dalla provenienza ─────────────────────────────
const conStoria = new Set(righe.map(r => r._contatto.id).filter(Boolean))
for (const c of contatti) {
  if (conStoria.has(c.id) || (c.attivita_numero || 0) > 0) continue
  const tag = c.tags || []
  const r = tag.includes('newsletter') ? { tipo: 'newsletter', titolo: 'Iscrizione alla newsletter', riferimento: 'iscrizione' }
    : c.fonte === 'minisito' ? { tipo: 'richiesta', titolo: 'Messaggio dal sito', riferimento: 'storico' }
    : c.fonte === 'pwa' ? { tipo: 'prenotazione', titolo: 'Richiesta dall’app', riferimento: 'storico' }
    : c.fonte === 'form' ? { tipo: 'modulo', titolo: tag[0] || 'Modulo', riferimento: 'storico' }
    : null   // aggiunti a mano, importati, o di cui non sappiamo: nessuna riga inventata
  if (!r) { segna(c.azienda_id, 'contatti senza storia (a mano, importati, ignota)'); continue }
  riga(c, c.azienda_id, { ...r, avvenuta_il: c.created_at })
}

// ── Il resoconto ─────────────────────────────────────────────────────────────
console.log(`\n${ESEGUI ? 'ESEGUO' : 'SIMULAZIONE — non scrivo niente'}\n`)
console.log(`contatti oggi: ${contatti.length} · righe già nel registro: ${esistenti.size}`)
console.log(`chiave del telefono da scrivere: ${conChiave.length}${senzaChiave.length ? ` · numeri che non si riescono a leggere: ${senzaChiave.length} (${senzaChiave.slice(0, 4).map(x => `«${x.telefono}»`).join(', ')})` : ''}`)
console.log(`contatti da creare: ${daCreare.length} · righe da scrivere nel registro: ${righe.length}\n`)
for (const [k, v] of Object.entries(perAzienda).sort()) {
  console.log(`━━ ${k}`)
  for (const [cosa, n] of Object.entries(v).sort()) console.log(`   ${String(n).padStart(4)}  ${cosa}`)
}
if (daCreare.length) {
  console.log('\ncontatti che verrebbero creati (nome · da dove · quando):')
  for (const c of daCreare.slice(0, 40)) console.log(`   ${(nomeAz[c.azienda_id] || '?').slice(0, 22).padEnd(22)} ${String(c.nome).slice(0, 26).padEnd(26)} ${c.fonte.padEnd(13)} ${String(c.created_at).slice(0, 10)}  ${c.email ? 'email' : ''}${c.email && c.telefono ? '+' : ''}${c.telefono ? 'telefono' : ''}`)
  if (daCreare.length > 40) console.log(`   … e altri ${daCreare.length - 40}`)
}

if (!ESEGUI) { console.log('\nPer scrivere davvero: node ricostruisci-attivita-contatti.mjs --esegui'); process.exit(0) }

// ── Scrittura ────────────────────────────────────────────────────────────────
let scritte = 0, saltate = 0, errori = 0
for (const x of conChiave) { const { error } = await a.from('contatti').update({ telefono_e164: x.e164 }).eq('id', x.id); if (error) { errori++; console.error('chiave:', error.message) } }
for (const c of daCreare) {
  const { data, error } = await a.from('contatti').insert({ azienda_id: c.azienda_id, nome: c.nome, email: c.email, telefono: c.telefono, telefono_e164: c.telefono_e164,
    fonte: c.fonte, tags: [], iscritto_newsletter: false, created_at: c.created_at }).select('id').single()
  if (error) { errori++; console.error('contatto:', error.message); continue }
  c.id = data.id
}
for (const r of righe) {
  const { _contatto, ...resto } = r
  if (!_contatto.id) { saltate++; continue }
  const { error } = await a.from('contatti_attivita').insert({ ...resto, contatto_id: _contatto.id })
  if (!error) scritte++
  else if (error.code === '23505') saltate++
  else { errori++; console.error('registro:', error.message) }
}
console.log(`\nFATTO: ${conChiave.length} chiavi, ${daCreare.filter(c => c.id).length} contatti creati, ${scritte} righe scritte, ${saltate} già presenti, ${errori} errori`)
process.exit(errori ? 1 : 0)
