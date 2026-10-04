// Il registro delle attività dei contatti (migration 130): c'è, conta giusto, ed è chiuso.
//
// Prova il database direttamente, non le route: il riepilogo sul contatto
// (quante attività, qual è l'ultima) lo tiene allineato un trigger, e deve
// valere per chiunque scriva nel registro.
//
// Tutto su un'azienda ZZ creata e cancellata qui. Nessuna email, nessuna route.
//
// Uso: cd tests && node probe-contatti-attivita.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })

let problemi = 0
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗'} ${m}`); if (!c) problemi++ }
const t = Date.now()
let aziendaId = null

try {
  const { data: az, error: e0 } = await a.from('aziende').insert({ ragione_sociale: `ZZ-REGISTRO-${t}`, require_2fa: false }).select().single()
  if (e0) throw new Error('azienda: ' + e0.message)
  aziendaId = az.id
  const contatto = async (extra) => {
    const { data, error } = await a.from('contatti').insert({ azienda_id: az.id, nome: 'ZZ Persona', fonte: 'manuale', ...extra }).select().single()
    if (error) throw new Error('contatto: ' + error.message)
    return data
  }
  const leggi = id => a.from('contatti').select('attivita_numero, ultima_attivita_il, ultima_attivita_tipo, ultima_attivita_titolo, telefono_e164, marketing_consenso_il').eq('id', id).single().then(r => r.data)
  const riga = (c, extra) => a.from('contatti_attivita').insert({ azienda_id: az.id, contatto_id: c.id, ...extra }).select().single()

  console.log('\n1 · LE COLONNE NUOVE DEL CONTATTO\n')
  const c1 = await contatto({ email: `zz-reg-${t}@playwright.internal`, telefono: '333 1234567', telefono_e164: '+393331234567' })
  const v0 = await leggi(c1.id)
  ok(v0 && v0.attivita_numero === 0 && v0.ultima_attivita_il === null && v0.telefono_e164 === '+393331234567', 'un contatto nasce con zero attività e il telefono in forma internazionale')
  // Chi arriva da WhatsApp ha un numero e nessuna email: deve poter esistere.
  const c2 = await contatto({ telefono: '+39 347 0000000', telefono_e164: '+393470000000' })
  ok(!!c2?.id, 'un contatto senza email si può creare')
  const storto = await a.from('contatti').insert({ azienda_id: az.id, nome: 'ZZ Storto', telefono_e164: '333-12' }).select()
  ok(!!storto.error, `un numero che non è in forma internazionale viene rifiutato (${(storto.error?.message || 'ACCETTATO').slice(0, 60)})`)

  console.log('\n2 · IL REGISTRO E IL RIEPILOGO\n')
  const eventoId = '11111111-1111-4111-8111-111111111111'
  const r1 = await riga(c1, { tipo: 'evento', titolo: 'ZZ Serata uno', origine_id: eventoId, riferimento: `pren-1-${t}`, dettaglio: { posti: 2 }, avvenuta_il: '2026-09-01T18:00:00Z' })
  ok(!r1.error, `una riga entra${r1.error ? ' — ' + r1.error.message : ''}`)
  let v = await leggi(c1.id)
  ok(v.attivita_numero === 1 && v.ultima_attivita_tipo === 'evento' && v.ultima_attivita_titolo === 'ZZ Serata uno', `il contatto dice 1 attività, l’ultima è la serata (${v.attivita_numero}, ${v.ultima_attivita_titolo})`)
  const r2 = await riga(c1, { tipo: 'modulo', titolo: 'ZZ Modulo', riferimento: `invio-1-${t}`, avvenuta_il: '2026-09-20T10:00:00Z' })
  const r3 = await riga(c1, { tipo: 'lista_attesa', titolo: 'ZZ Serata vecchia', riferimento: `pren-0-${t}`, avvenuta_il: '2026-08-01T10:00:00Z' })
  v = await leggi(c1.id)
  ok(v.attivita_numero === 3 && v.ultima_attivita_titolo === 'ZZ Modulo', `tre attività, e «l’ultima» è la più recente per data, non l’ultima inserita (${v.attivita_numero}, ${v.ultima_attivita_titolo})`)
  const doppia = await riga(c1, { tipo: 'evento', titolo: 'ZZ Serata uno', origine_id: eventoId, riferimento: `pren-1-${t}` })
  v = await leggi(c1.id)
  ok(!!doppia.error && v.attivita_numero === 3, 'la stessa prenotazione non si registra due volte')
  const inventato = await riga(c1, { tipo: 'inventato', titolo: 'x' })
  ok(!!inventato.error, 'un tipo fuori catalogo viene rifiutato')
  const nonOggetto = await riga(c1, { tipo: 'altro', dettaglio: ['a'] })
  ok(!!nonOggetto.error, 'il dettaglio dev’essere un oggetto')
  await a.from('contatti_attivita').delete().eq('id', r2.data.id)
  v = await leggi(c1.id)
  ok(v.attivita_numero === 2 && v.ultima_attivita_titolo === 'ZZ Serata uno', `togliendo una riga il riepilogo si ricalcola (${v.attivita_numero}, ${v.ultima_attivita_titolo})`)
  // Spostare una riga da un contatto a un altro aggiorna tutti e due: serve quando si uniscono due doppioni.
  await a.from('contatti_attivita').update({ contatto_id: c2.id }).eq('id', r3.data.id)
  const [v1, v2] = [await leggi(c1.id), await leggi(c2.id)]
  ok(v1.attivita_numero === 1 && v2.attivita_numero === 1 && v2.ultima_attivita_titolo === 'ZZ Serata vecchia', 'spostando una riga su un altro contatto si aggiornano tutti e due')
  await a.from('contatti_attivita').delete().eq('contatto_id', c2.id)
  v = await leggi(c2.id)
  ok(v.attivita_numero === 0 && v.ultima_attivita_il === null && v.ultima_attivita_titolo === null, 'senza più righe il riepilogo torna vuoto')

  console.log('\n3 · CHI BUSSA SENZA PASSARE DA NOI\n')
  const fuori = await anon.from('contatti_attivita').select('id, titolo').eq('azienda_id', az.id)
  ok(!fuori.data?.length, `senza login non si legge niente (${fuori.error ? 'rifiutato' : (fuori.data?.length ?? 0) + ' righe'})`)
  const scrive = await anon.from('contatti_attivita').insert({ azienda_id: az.id, contatto_id: c1.id, tipo: 'altro' }).select()
  ok(!!scrive.error || !scrive.data?.length, 'né si scrive')
  const chiama = await anon.rpc('contatto_riepiloga', { chi: c1.id })
  ok(!!chiama.error, `la funzione di ricalcolo non è chiamabile dall’esterno (${(chiama.error?.message || 'ESEGUITA').slice(0, 70)})`)
  v = await leggi(c1.id)
  ok(v.attivita_numero === 1, 'e il conteggio è rimasto quello vero')

  console.log('\n4 · CANCELLARE PORTA VIA TUTTO\n')
  await a.from('contatti').delete().eq('id', c1.id)
  const resti = await a.from('contatti_attivita').select('id', { count: 'exact', head: true }).eq('contatto_id', c1.id)
  ok((resti.count || 0) === 0, 'cancellato il contatto, le sue righe nel registro se ne vanno')
  await riga(c2, { tipo: 'whatsapp', titolo: 'Ha scritto su WhatsApp', riferimento: `wamid-${t}` })
  await a.from('aziende').delete().eq('id', az.id); aziendaId = null
  const dopo = await a.from('contatti_attivita').select('id', { count: 'exact', head: true }).eq('azienda_id', az.id)
  ok((dopo.count || 0) === 0, 'cancellata l’azienda, non resta niente')

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'IL REGISTRO C’È, CONTA GIUSTO ED È CHIUSO')
} catch (e) {
  console.error('ERRORE:', e.message); problemi++
} finally {
  if (aziendaId) await a.from('aziende').delete().eq('id', aziendaId)
  console.log('[probe] pulito')
  process.exit(problemi ? 1 : 0)
}
