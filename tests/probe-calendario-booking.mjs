// Il calendario del mese dice la verità su quali giorni sono occupati.
//
// Il difetto che questo calendario ha reso visibile: un affitto dal 10 al 14
// risultava occupato **solo il 10**, perché sia l'occupancy sia l'elenco del
// giorno chiedevano `data = X`. Il titolare avrebbe riaffittato dall'11 al 13.
//
// L'ultimo giorno è quello dell'uscita: chi entra quel mattino trova libero.
//
// Uso: node probe-calendario-booking.mjs
import { chromium } from '@playwright/test'
import { withProbeSession, admin, TEST_URL } from './probe-auth.mjs'
const L = process.env.TEST_LOCALE || TEST_URL
const g = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
let ko = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) ko++ }

let az = null, en = null, ris = null
try {
  const { data: a } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-CAL-${Date.now()}`, require_2fa: false }).select().single(); az = a.id
  const { data: e } = await admin.from('entita').insert({ azienda_id: az, tipo: 'attivita', slug: `zz-cal-${Date.now()}`, name: 'ZZ Case', active: true }).select().single(); en = e.id
  const { data: r } = await admin.from('risorse').insert({ azienda_id: az, entity_tipo: 'attivita', entity_id: en,
    nome: 'ZZ Casa al mare', modalita: 'giornaliero', quantita: 1, prezzo: 100, attiva: true, conferma_auto: true,
    visibile_minisito: true, disponibilita: {}, blocchi: [] }).select().single(); ris = r.id
  // Un affitto di quattro notti, dentro il mese corrente per quanto possibile.
  await admin.from('prenotazioni').insert({ risorsa_id: ris, azienda_id: az, entity_tipo: 'attivita', entity_id: en,
    data: g(3), data_fine: g(7), cliente_nome: 'ZZ Ospite', cliente_email: 'zz@example.com', n_persone: 2,
    stato: 'confermata', importo_totale: 400 })

  console.log('\nIL CALENDARIO DICE LA VERITÀ\n')

  await withProbeSession(async ({ page }) => {
    const errori = []
    page.on('pageerror', x => errori.push('ECCEZIONE: ' + x.message))
    page.on('console', m => { if (m.type() === 'error' && !/favicon|404|manifest/i.test(m.text())) errori.push(m.text().slice(0, 150)) })


    await page.goto(`${L}/admin/booking`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2500)
    // ⚠️ Un super_admin vede le risorse di tutte le aziende: senza sceglierla,
    // il calendario si apre su quella di un altro cliente e il pannello risulta
    // vuoto — sembra un guasto e invece si sta guardando la cosa sbagliata.
    await page.locator('select').last().selectOption(ris).catch(() => {})
    await page.waitForTimeout(1500)
    // Si guarda **il colore delle caselle**, cioè quello che vede chi usa il
    // pannello. Interrogare l'API direttamente direbbe se il conto è giusto, non
    // se il calendario lo mostra: sono due domande diverse e qui conta la seconda.
    // ⚠️ Si riparte sempre dal mese corrente e si avanza quanto serve: la prima
    // versione avanzava e non tornava indietro, così i controlli successivi
    // cercavano nel mese sbagliato e sembravano guasti. Una sonda che si porta
    // dietro lo stato del controllo precedente mente.
    const vaiA = async giorno => {
      await page.getByRole('button', { name: 'Oggi' }).click()
      await page.waitForTimeout(800)
      for (let i = 0; i < 3; i++) {
        if (await page.locator(`[data-giorno="${giorno}"]`).count()) return page.locator(`[data-giorno="${giorno}"]`)
        await page.getByLabel('Mese successivo').click()
        await page.waitForTimeout(900)
      }
      return null
    }

    const occupato = async giorno => {
      const c = await vaiA(giorno)
      if (!c) return null
      const sfondo = await c.evaluate(el => getComputedStyle(el).backgroundColor)
      // Il verde del «libero» è #f2fbf4.
      return !/242,\s*251,\s*244/.test(sfondo)
    }

    ok(await occupato(g(3)) === true, `il giorno d'ingresso è colorato come occupato`)
    ok(await occupato(g(5)) === true, `anche quello in mezzo (era il difetto: prima no)`)
    ok(await occupato(g(6)) === true, `e l'ultima notte`)
    ok(await occupato(g(7)) === false, `il giorno dell'uscita torna libero`)
    ok(await occupato(g(2)) === false, `il giorno prima è libero`)

    await page.getByText('ZZ Casa al mare').first().waitFor({ timeout: 25000 }).catch(() => {})
    await page.waitForTimeout(1500)
    const testo = await page.locator('body').innerText()
    ok(/Libero/.test(testo) && /Pieno/.test(testo), 'la legenda dei colori c\'è')
    ok(/Oggi/.test(testo), 'si può tornare al mese corrente')

    // Il giorno in mezzo: cliccandolo deve comparire chi c'è.
    // ⚠️ Ci si aggancia a `data-giorno`, non al numero scritto dentro: cercare
    // «il div che contiene 12» prende quello sbagliato e fa credere a un guasto
    // che non c'è.
    // ⚠️ Il giorno di prova può cadere nel mese successivo (a fine mese capita
    // sempre): si passa avanti col pulsante, che è anche il modo di verificare
    // che la navigazione fra i mesi funzioni.
    const cella = await vaiA(g(5))
    ok(!!cella, 'si arriva al giorno voluto, anche cambiando mese')
    if (cella) {
      await cella.click()
      await page.getByText('ZZ Ospite').first().waitFor({ timeout: 15000 }).catch(() => {})
    }
    const dopo = await page.locator('body').innerText()
    ok(/ZZ Ospite/.test(dopo), 'cliccando un giorno in mezzo si vede chi ha prenotato')
    ok(/dal .* al /.test(dopo), 'e si legge il periodo, non un orario')
    ok(/Annulla/.test(dopo) && /Elimina/.test(dopo), 'ci sono le azioni: annulla ed elimina')
    ok(errori.length === 0, `nessun errore nel browser${errori.length ? ': ' + errori.slice(0, 2).join(' | ') : ''}`)
  }, { width: 1280, height: 1000 })

  console.log('\n' + '-'.repeat(62))
  console.log(ko ? `  ${ko} PROBLEMI` : '  IL MESE MOSTRA I GIORNI DAVVERO OCCUPATI')
} catch (e) { console.error('ERRORE:', e.message); ko++ }
finally {
  if (ris) { await admin.from('prenotazioni').delete().eq('risorsa_id', ris); await admin.from('risorse').delete().eq('id', ris) }
  if (en) await admin.from('entita').delete().eq('id', en)
  if (az) { const { error } = await admin.from('aziende').delete().eq('id', az); if (error) console.error('pulizia:', error.message) }
  console.log('[probe] pulito')
  process.exit(ko ? 1 : 0)
}
