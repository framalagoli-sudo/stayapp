// Sonda: un'azienda può scrivere i propri dati DENTRO quelli di un'altra, o
// cambiarsi un campo che non le spetta?
//
// È il «mass-assignment» visto da chi attacca: le porte di scrittura accettano
// un corpo dal client, e se si fidano di `azienda_id`/`entity_id`/`role`/`price`
// che arrivano lì dentro, l'azienda B crea un contatto nell'azienda A, aggancia
// un evento al sito di A (dove compare al pubblico e ne raccoglie le
// prenotazioni), o si promuove a super_admin.
//
// Primo giro dell'agente che prova a entrare (16/10/2026, chiesto da Francesco):
// qui il cervello è Ettore, le mosse sono quelle di un attaccante. Ogni mossa
// che regge diventa una riga fissa di questa sonda, che poi gira in deploy.ps1.
//
// Due aziende «ZZ-DIR-…» con i loro utenti, tutto cancellato con
// `cancellaAziendaDiProva`. Recapiti finti (@playwright.internal). Non scrive
// mai nell'azienda di un cliente vero: le mosse puntano SOLO fra A e B di prova.
//
// Uso: cd tests && node probe-dirottamento.mjs [--verbose]
//      $env:TEST_URL='http://localhost:3000' per il locale.
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const verbose = process.argv.includes('--verbose')
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }
const t = Date.now().toString(36)
const M = `ZZDIR${t}`   // il marcatore: se compare in A, l'ha scritto B

async function creaAzienda(etichetta, ruolo = 'admin_azienda') {
  const az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-DIR-${etichetta}-${t}`, require_2fa: false, moduli: { attivita: true } }).select().single(), 'azienda')
  const ent = await deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'attivita', name: `ZZ ${etichetta}`, slug: `zz-dir-${etichetta.toLowerCase()}-${t}`, active: true, minisito: { active: true } }).select().single(), 'entità')
  const email = `zz-dir-${etichetta.toLowerCase()}-${t}@playwright.internal`
  const password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u, error } = await a.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error('utente: ' + error.message)
  await a.from('profiles').upsert({ id: u.user.id, role: ruolo, full_name: `ZZ ${etichetta}`, azienda_id: az.id }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  return { az: az.id, ent: ent.id, user: u.user.id, token: s.session.access_token }
}

let A = null, B = null, rossi = 0
const problemi = []
async function chiama(path, token, metodo, corpo) {
  try {
    const r = await fetch(BASE + path, {
      method: metodo,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: AbortSignal.timeout(30000),
    })
    return { status: r.status, corpo: (await r.text().catch(() => '')).slice(0, 300) }
  } catch (e) { return { status: 0, corpo: e.message } }
}

// Conta le righe di una tabella che portano il marcatore e stanno nell'azienda/entità di A.
async function finiteInA(tab, colonna, filtro = {}) {
  let q = a.from(tab).select('id', { count: 'exact', head: true })
  for (const [k, v] of Object.entries(filtro)) q = q.eq(k, v)
  const { count } = await q.ilike(colonna, `%${M}%`)
  return count || 0
}

try {
  A = await creaAzienda('A')
  B = await creaAzienda('B')
  console.log(`due aziende di prova (A, B). Attacco: B prova a scrivere in A.\n`)

  // ── Dirottamento via corpo: B crea un oggetto iniettando gli id di A ─────────
  // Per ognuno: l'oggetto NON deve finire nell'azienda/entità di A. Se la route
  // accetta, deve averlo scritto in B (azienda di chi chiede), mai in A.
  const mosse = [
    { nome: 'contatto in A',        path: '/api/contatti',         tab: 'contatti',   col: 'nome',   corpo: { nome: `${M} Vittima`, email: `${M.toLowerCase()}@example.invalid`, azienda_id: A.az } },
    { nome: 'evento sul sito di A', path: '/api/eventi',           tab: 'eventi',     col: 'title',  corpo: { title: `${M} Evento`, slug: `${M.toLowerCase()}-ev`, date_start: new Date(Date.now()+9e8).toISOString(), entity_tipo: 'attivita', entity_id: A.ent, azienda_id: A.az } },
    { nome: 'risorsa sul sito di A',path: '/api/booking/risorse',  tab: 'risorse',    col: 'nome',   corpo: { nome: `${M} Furgone`, modalita: 'giornaliero', prezzo: 1, quantita: 1, entity_tipo: 'attivita', entity_id: A.ent, azienda_id: A.az } },
    { nome: 'sezione sul sito di A',path: '/api/sezioni',          tab: 'sezioni',    col: 'nome',   corpo: { nome: `${M} Sezione`, entity_tipo: 'attivita', entity_id: A.ent, blocks: [] } },
    { nome: 'offerta sul sito di A',path: '/api/offerte',          tab: 'offerte',    col: 'titolo', corpo: { titolo: `${M} Offerta`, entity_id: A.ent, azienda_id: A.az, impegno: 'chiedi', modo: 'richiesta' } },
    { nome: 'recensione su A',      path: '/api/recensioni',       tab: 'recensioni', col: 'autore', corpo: { autore: `${M} Finto`, stelle: 5, entity_tipo: 'attivita', entity_id: A.ent, azienda_id: A.az } },
    { nome: 'articolo sul sito di A',path: '/api/blog',            tab: 'articoli',   col: 'title',  corpo: { title: `${M} Articolo`, slug: `${M.toLowerCase()}-art`, entity_tipo: 'attivita', entity_id: A.ent, azienda_id: A.az } },
    { nome: 'automazione sul sito di A',path: '/api/automazioni',  tab: 'automazioni',col: 'nome',   corpo: { nome: `${M} Auto`, entity_tipo: 'attivita', entity_id: A.ent, azienda_id: A.az, trigger_evento: 'nuovo_contatto', steps: [] } },
    { nome: 'newsletter in A',      path: '/api/newsletter',       tab: 'newsletters',col: 'subject',corpo: { subject: `${M} News`, azienda_id: A.az, entity_tipo: 'attivita', entity_id: A.ent } },
    { nome: 'modulo in A',          path: '/api/form-builder',     tab: 'form_builder',col: 'nome',  corpo: { nome: `${M} Modulo`, azienda_id: A.az, campi: [] } },
  ]
  console.log('[1] B prova a creare oggetti dentro l’azienda/sito di A (via corpo)')
  for (const m of mosse) {
    const r = await chiama(m.path, B.token, 'POST', m.corpo)
    // Dove può finire in A: per azienda o per entità (gli oggetti del sito).
    const perAzienda = await finiteInA(m.tab, m.col, { azienda_id: A.az })
    const perEntita = m.corpo.entity_id ? await finiteInA(m.tab, m.col, { entity_id: A.ent }) : 0
    if (perAzienda || perEntita) {
      const dove = perAzienda ? `nell’azienda di A (furto pieno)` : `agganciata al SITO di A (entity_id): compare nelle pagine pubbliche di A`
      problemi.push(`DIROTTAMENTO · ${m.nome}: B ha scritto ${perAzienda + perEntita} righe «${m.tab}» ${dove} (POST ${m.path} → ${r.status})`)
      console.log(`    ✗ ${m.nome} → ${perAzienda ? 'azienda di A' : 'sito di A'}`)
    } else if (verbose) console.log(`    · ${m.nome} → ${r.status}, niente in A`)
  }
  if (!problemi.length) console.log('    nessun oggetto di B è finito in A ✓')

  // ── Campi privilegiati: B prova a cambiarsi qualcosa che non gli spetta ──────
  console.log('\n[2] B prova a cambiarsi un campo privilegiato')
  const privilegi = []
  // Promuoversi a super_admin o spostarsi d'azienda.
  await chiama(`/api/users/${B.user}`, B.token, 'PATCH', { role: 'super_admin' })
  await chiama(`/api/users/${B.user}`, B.token, 'PATCH', { azienda_id: A.az })
  const { data: profB } = await a.from('profiles').select('role, azienda_id').eq('id', B.user).single()
  if (profB.role !== 'admin_azienda') privilegi.push(`B si è dato il ruolo «${profB.role}»`)
  if (profB.azienda_id !== B.az) privilegi.push(`B ha cambiato la propria azienda`)
  // Cambiare il piano o il tipo della propria entità (campi di sistema).
  await chiama(`/api/attivita/${B.ent}`, B.token, 'PATCH', { plan: 'premium', tipo: 'struttura', azienda_id: A.az })
  const { data: entB } = await a.from('entita').select('plan, tipo, azienda_id').eq('id', B.ent).single()
  if (entB.plan === 'premium') privilegi.push(`B si è messo plan=premium sull’entità`)
  if (entB.tipo !== 'attivita') privilegi.push(`B ha cambiato il tipo dell’entità a «${entB.tipo}»`)
  if (entB.azienda_id !== B.az) privilegi.push(`B ha spostato la propria entità in un’altra azienda`)
  // Alzarsi il budget AI dell'azienda.
  await chiama(`/api/aziende/${B.az}/credito-ai`, B.token, 'PATCH', { ai_budget_mensile_usd: 9999 })
  const { data: azB } = await a.from('aziende').select('ai_budget_mensile_usd').eq('id', B.az).single()
  if (Number(azB.ai_budget_mensile_usd) === 9999) privilegi.push(`B si è alzato il budget AI a 9999`)
  for (const p of privilegi) { problemi.push(`PRIVILEGIO · ${p}`); console.log(`    ✗ ${p}`) }
  if (!privilegi.length) console.log('    nessun campo privilegiato ha ceduto ✓')

  // ── Scoping via query: una lista mostra i dati di A se glielo chiedo? ────────
  console.log('\n[3] B chiede le liste con ?azienda_id / ?entity_id di A')
  const liste = [
    `/api/contatti?azienda_id=${A.az}`,
    `/api/eventi/riepilogo?azienda_id=${A.az}`,
    `/api/newsletter?azienda_id=${A.az}`,
    `/api/blog?azienda_id=${A.az}&entity_tipo=attivita&entity_id=${A.ent}`,
    `/api/form-builder?entity_tipo=attivita&entity_id=${A.ent}`,
    `/api/sezioni?entity_tipo=attivita&entity_id=${A.ent}`,
  ]
  // Un marcatore SOLO di A, scritto via admin e mai postato da B: così quello
  // che il test crea in B (con `M`) non si confonde con un vero leak di A.
  const MA = `ZZSOLOA${t}`
  await deve(a.from('contatti').insert({ azienda_id: A.az, nome: `${MA} ListaContatto`, email: `${MA.toLowerCase()}@example.invalid`, fonte: 'probe' }), 'contatto marcato A')
  await deve(a.from('newsletters').insert({ azienda_id: A.az, subject: `${MA} News di A`, entity_tipo: 'attivita', entity_id: A.ent }), 'newsletter A')
  await deve(a.from('form_builder').insert({ azienda_id: A.az, nome: `${MA} Modulo di A`, attivo: true, campi: [] }), 'modulo A')
  let fughe = 0
  for (const l of liste) {
    const r = await chiama(l, B.token, 'GET')
    if (r.status === 200 && r.corpo.includes(MA)) {
      problemi.push(`FUGA · GET ${l} ha restituito dati di A a B`)
      console.log(`    ✗ ${l} → dati di A`)
      fughe++
    } else if (verbose) console.log(`    · ${l} → ${r.status}`)
  }
  if (!fughe) console.log('    nessuna lista ha perso dati di A ✓')

  // ── Il rovescio: A fa le sue cose legittime (la difesa non chiude il caso buono) ──
  console.log('\n[4] A crea i suoi contenuti per la propria entità')
  const buone = [
    { nome: 'newsletter per la sua entità', path: '/api/newsletter', corpo: { subject: `${M} Mia news`, entity_tipo: 'attivita', entity_id: A.ent } },
    { nome: 'evento sul suo sito',          path: '/api/eventi',     corpo: { title: `${M} Mio evento`, slug: `${M.toLowerCase()}-mio`, date_start: new Date(Date.now()+9e8).toISOString(), entity_tipo: 'attivita', entity_id: A.ent } },
  ]
  for (const b of buone) {
    const r = await chiama(b.path, A.token, 'POST', b.corpo)
    if (r.status < 200 || r.status >= 300) { problemi.push(`CHIUSA AL TITOLARE · ${b.nome}: A non riesce (POST ${b.path} → ${r.status} ${r.corpo.slice(0,80)})`); console.log(`    ✗ ${b.nome} → ${r.status}`) }
    else console.log(`    ✓ ${b.nome} → ${r.status}`)
  }

  console.log('\n' + '─'.repeat(64))
  if (!problemi.length) console.log('✓ NESSUN DIROTTAMENTO: B non ha toccato niente di A, e A fa le sue cose')
  else { rossi = problemi.length; console.log(`✗ ${problemi.length} DA GUARDARE\n`); problemi.forEach(p => console.log(`  ${p}`)) }
} catch (e) {
  rossi++; console.error('ERRORE:', e.message)
} finally {
  for (const x of [A, B]) {
    if (!x) continue
    await a.auth.admin.deleteUser(x.user).catch(() => {})
    await cancellaAziendaDiProva(x.az).catch(e => console.error('pulizia:', e.message))
  }
  console.log('\n[probe] aziende di prova eliminate')
  process.exit(rossi ? 1 : 0)
}
