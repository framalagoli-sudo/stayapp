// La pagina di un'offerta si apre, e chi chiede informazioni finisce nel CRM.
//
// ⚠️ Nasce da due guasti dello stesso giorno:
//   1. il blocco «Offerte» puntava a una pagina **mai creata**: tutte le offerte
//      pubblicate rispondevano 404. Un pulsante scritto senza aprire la
//      destinazione — la regola numero uno, violata da chi l'ha scritta.
//   2. le offerte erano diventate prenotabili. Non lo sono: si **chiede** o si
//      **acquista**. Prenotabili sono le Risorse (Booking) e gli Eventi.
//
// Perciò qui non si controlla che il codice compili: si apre la pagina con un
// browser vero, si clicca il pulsante e si guarda se il contatto è arrivato
// dove deve — nei contatti del cliente, che è il motivo per cui esiste.
//
// Uso: node probe-pagina-offerta.mjs            (produzione)
//      TEST_LOCALE=http://localhost:3000 node probe-pagina-offerta.mjs
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.test' })

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
const L = process.env.TEST_LOCALE || 'https://www.oltrenova.com'
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const PREFISSO = { struttura: 's', ristorante: 'r', attivita: 'a' }

let problemi = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) problemi++ }

const browser = await chromium.launch()
const contattiCreati = []
try {
  const { data: offerte } = await admin.from('offerte')
    .select('id, titolo, entity_id, impegno').eq('pubblicata', true).eq('attiva', true)

  if (!offerte?.length) {
    console.log('\nNessuna offerta pubblicata: niente da provare (non è un guasto).\n')
    process.exit(0)
  }

  console.log('\nLE OFFERTE PUBBLICATE HANNO UNA PAGINA CHE SI APRE\n')
  let primaValida = null
  for (const o of offerte) {
    const { data: ent } = await admin.from('entita').select('slug, tipo, name').eq('id', o.entity_id).maybeSingle()
    if (!ent) continue
    const url = `${L}/${PREFISSO[ent.tipo]}/${ent.slug}/offerte/${o.id}`

    const page = await browser.newPage()
    const errori = []
    page.on('pageerror', e => errori.push(e.message))
    page.on('console', m => { if (m.type() === 'error' && !/favicon|manifest|404|turnstile/i.test(m.text())) errori.push(m.text()) })
    const risposta = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
    const testo = await page.locator('body').innerText()

    ok(risposta.status() === 200 && errori.length === 0,
       `${String(risposta.status()).padEnd(4)} ${(o.titolo || '').slice(0, 34).padEnd(36)}${errori.length ? 'ERRORI: ' + errori[0] : ''}`)
    if (risposta.status() === 200) {
      ok(testo.includes(o.titolo), `      il titolo compare nella pagina`)
      // ⛔ Il controllo che dà il nome a questa sonda: un'offerta NON si prenota.
      ok(!/\bPrenota\b/.test(testo), `      nessun pulsante «Prenota» (un'offerta si chiede, non si prenota)`)
      if (!primaValida) primaValida = { o, ent, url }
    }
    await page.close()
  }

  // ── la richiesta arriva davvero nei contatti
  if (primaValida) {
    console.log('\nCHI CHIEDE INFORMAZIONI FINISCE NEI CONTATTI\n')
    const { o, ent, url } = primaValida
    const email = `zz-offerta-${Date.now()}@playwright.internal`
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 })

    // ⚠️ Il modulo si monta **al click**: finché nessuno clicca, il suo codice
    // non gira e un identificatore fuori scope non si vede. È il modo in cui un
    // guasto è già arrivato in produzione.
    await page.locator('button', { hasText: /Richiedi informazioni/i }).first().click()
    await page.waitForTimeout(400)
    ok(await page.locator('input[placeholder="Nome e cognome"]').count() > 0, 'il modulo si apre al click')

    await page.fill('input[placeholder="Nome e cognome"]', 'Prova Sonda')
    await page.fill('input[placeholder="Email"]', email)

    // Il consenso è obbligatorio: senza spunta il pulsante resta spento.
    const invia = page.locator('button[type="submit"]')
    ok(await invia.isDisabled(), 'senza consenso non si può inviare')

    await page.locator('input[type="checkbox"]').first().check()

    // ⚠️ Aspettare «un po'» è il modo di misurare che costa i giri persi: se la
    // risposta tarda, il controllo legge un database ancora vuoto e accusa il
    // codice di un guasto che non c'è. Qui si aspetta **la risposta vera**.
    const risposta = page.waitForResponse(r => r.url().includes('/api/guest/contact') && r.request().method() === 'POST', { timeout: 20000 })
    await invia.click()
    const esito = await risposta
    ok(esito.status() === 200, `la richiesta è stata accettata (HTTP ${esito.status()})`)
    await page.waitForTimeout(600) // il tempo della scrittura, non della rete

    const { data: arrivato } = await admin.from('contatti')
      .select('id, nome, note, tags, azienda_id').eq('email', email).maybeSingle()
    if (arrivato) contattiCreati.push(arrivato.id)

    // ⚠️ `contatti` non ha `entity_id`: il recinto è l'azienda. Controllare una
    // colonna che non esiste dà sempre «no» e fa cercare un guasto inesistente.
    const { data: az } = await admin.from('entita').select('azienda_id').eq('id', o.entity_id).maybeSingle()
    ok(!!arrivato, 'il contatto è arrivato nel CRM')
    ok(arrivato?.azienda_id === az?.azienda_id, `      finito nell'azienda giusta (${ent.slug})`)
    ok((arrivato?.note || '').includes(o.titolo), `      la nota dice quale offerta: «${o.titolo}»`)
    ok((arrivato?.tags || []).includes('offerta'), `      taggato «offerta»  [${(arrivato?.tags || []).join(' ')}]`)
    await page.close()
  }

  console.log('\n' + '─'.repeat(64))
  console.log(problemi ? `${problemi} PROBLEMI` : 'LA PAGINA OFFERTA REGGE, E IL LEAD RESTA AL CLIENTE')
} catch (e) {
  console.error('ERRORE:', e.message)
  problemi++
} finally {
  await browser.close()
  for (const id of contattiCreati) {
    const { error } = await admin.from('contatti').delete().eq('id', id)
    if (error) console.error('pulizia:', error.message)
  }
  console.log('[probe] pulito')
  process.exit(problemi ? 1 : 0)
}
