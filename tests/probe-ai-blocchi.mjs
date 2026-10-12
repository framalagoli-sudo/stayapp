// L'AI che costruisce i siti conosce «Contatti e orari» e «Listino prezzi»?
//
// Dà a «Ho già i contenuti» (/api/ai/from-document) lo stesso documento per due
// attività di prova: una coi recapiti già salvati, una senza. Poi guarda cosa è
// stato scritto nelle pagine e cosa esce nell'HTML del sito.
//   - il listino del documento diventa un blocco «listino», coi prezzi com'erano
//   - coi recapiti salvati compare «recapiti»; senza, l'indirizzo del documento
//     NON sparisce (il blocco non ha testi suoi: resterebbe vuoto)
//
// A mano: spende due chiamate vere all'AI (pochi centesimi), a carico
// dell'azienda di prova. `$env:TEST_URL='http://localhost:3000'` per il locale.

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const DOCUMENTO = `TITOLO E CLAIM
Studio ZZ Benessere — il tempo che ti prendi per te.

CHI SIAMO
Dal 2009 ci prendiamo cura delle persone con trattamenti manuali, senza fretta.

LISTINO
Massaggio rilassante 50 minuti — 55 €
Massaggio decontratturante 50 minuti — 60 €
Trattamento viso (pulizia profonda e maschera) — da 45 €
Pacchetto dieci sedute — su richiesta
I prezzi si intendono IVA inclusa.

CONTATTI
Ci trovi in Via Garibaldi 12, 05100 Terni. Telefono 0744 987654.
Aperti dal martedì al sabato, 9:30–19:00.
Scrivici per prenotare.`

let az = null, utente = null, rossi = 0
const esito = (ok, cosa, nota = '') => { if (!ok) rossi++; console.log(`  ${ok ? '✓' : '✗'} ${cosa}${nota ? `  — ${nota}` : ''}`) }
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }

try {
  const t = Date.now().toString(36)
  az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-AIBLOCCHI-${t}`, require_2fa: false, moduli: { attivita: true } }).select().single(), 'azienda')
  const nuova = (suffisso, recapiti) => deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'attivita', name: 'Studio ZZ Benessere', slug: `zz-ai-${suffisso}-${t}`, active: true, minisito: { active: true }, ...recapiti }).select().single(), 'entità')
  const con = await nuova('con', { address: 'Via Salvata 99, 05100 Terni', phone: '0744 111222', schedule: 'Mar–Sab 9:30–19:00' })
  const senza = await nuova('senza', {})

  const email = `zz-ai-${t}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u } = await a.auth.admin.createUser({ email, password, email_confirm: true }); utente = u.user.id
  await a.from('profiles').upsert({ id: utente, role: 'admin_azienda', full_name: 'ZZ', azienda_id: az.id }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })

  const genera = async ent => {
    const r = await fetch(`${BASE}/api/ai/from-document`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.session.access_token}` },
      body: JSON.stringify({ entity_tipo: 'attivita', entity_id: ent.id, documento: DOCUMENTO, multipagina: false }) })
    if (!r.ok) throw new Error(`from-document ${r.status}: ${(await r.text()).slice(0, 200)}`)
    const pagina = await deve(a.from('pagine').select('blocks').eq('entity_id', ent.id).eq('slug', '__home__').single(), 'home')
    const html = await (await fetch(`${BASE}/a/${ent.slug}`)).text()
    return { blocchi: pagina.blocks, html }
  }

  console.log(`\n${BASE} — attività CON i recapiti salvati`)
  {
    const { blocchi, html } = await genera(con)
    console.log('    blocchi: ' + blocchi.map(b => b.type).join(' · '))
    const listino = blocchi.find(b => b.type === 'listino')
    esito(!!listino && listino.data.items?.length === 4, 'il listino del documento è un blocco «listino» con le quattro voci', listino ? JSON.stringify(listino.data.items?.map(v => v.price)) : 'assente')
    esito(!!listino && listino.data.items.every(v => typeof v.name === 'string' && v.name && typeof v.price === 'string' && typeof v.id === 'string'), 'ogni voce ha nome, prezzo scritto come testo e un identificativo')
    esito(!!listino && ['55 €', '60 €', 'da 45 €'].every(p => listino.data.items.some(v => v.price === p)) && listino.data.items.some(v => /richiesta/i.test(v.price)), 'i prezzi sono quelli del documento, parola per parola')
    esito(html.includes('lbr-listino') && html.includes('da 45 €') && html.includes('Massaggio decontratturante'), 'sul sito il listino si legge nell’HTML')
    const rec = blocchi.find(b => b.type === 'recapiti')
    esito(!!rec, 'c’è il blocco «recapiti»')
    esito(!!rec && !/Garibaldi|987654|Salvata|111222/.test(JSON.stringify(rec.data)), 'e dentro non c’è scritto nessun recapito', rec ? JSON.stringify(rec.data) : '')
    esito(html.includes('Via Salvata 99') && html.includes('href="tel:0744111222'), 'sul sito mostra i recapiti SALVATI, non quelli del documento')
    esito(!blocchi.some(b => b.type !== 'recapiti' && /Garibaldi/.test(JSON.stringify(b.data))), 'l’indirizzo del documento non è ricopiato in altri testi')
  }

  console.log(`\n${BASE} — attività SENZA recapiti`)
  {
    const { blocchi, html } = await genera(senza)
    console.log('    blocchi: ' + blocchi.map(b => b.type).join(' · '))
    esito(!blocchi.some(b => b.type === 'recapiti'), 'niente blocco «recapiti»: resterebbe vuoto')
    esito(html.includes('Via Garibaldi 12') && html.includes('0744 987654'), 'l’indirizzo e il telefono del documento restano sul sito, come testo')
    esito(blocchi.some(b => b.type === 'listino'), 'il listino c’è anche qui')
  }
} catch (e) {
  rossi++; console.log(`\n  ✗ la sonda si è fermata: ${e.message}`)
} finally {
  if (utente) await a.auth.admin.deleteUser(utente).catch(() => {})
  if (az) await cancellaAziendaDiProva(az.id)
  console.log(`\n[probe] dati di prova eliminati — ${rossi ? `${rossi} ROSSI` : 'tutto verde'}`)
  process.exit(rossi ? 1 : 0)
}
