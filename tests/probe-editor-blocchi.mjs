// I blocchi che si configurano davvero nell'editor.
//
// ⚠️ Il difetto che questa sonda esiste per impedire: avevo scritto l'editor
// del «Widget prenotazione» e non veniva mai mostrato — una scorciatoia sopra
// lo switch («questo blocco non ha configurazione») intercettava `booking`
// prima. Avevo verificato il rendering pubblico e mai aperto l'editor.
//
// Aggiungendo un `case`, va sempre controllato che qualcosa non lo intercetti
// prima. E va **aperto**, non dedotto.
//
// Uso: node probe-editor-blocchi.mjs
import { withProbeSession, admin, TEST_URL } from './probe-auth.mjs'
const L = process.env.TEST_LOCALE || TEST_URL
let ko = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) ko++ }

let az = null, en = null, pag = null
try {
  const { data: a } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-ED-${Date.now()}`, require_2fa: false }).select().single(); az = a.id
  const { data: e } = await admin.from('entita').insert({ azienda_id: az, tipo: 'attivita', slug: `zz-ed-${Date.now()}`, name: 'ZZ Editor', active: true }).select().single(); en = e.id
  await admin.from('offerte').insert({ azienda_id: az, entity_id: en, titolo: 'ZZ Corso di prova', categoria: 'Corsi', prezzo: 50, modo: 'richiesta', impegno: 'chiedi', attiva: true, pubblicata: true })
  const { data: p } = await admin.from('pagine').insert({
    entity_tipo: 'attivita', entity_id: en, slug: 'zz-prova', titolo: 'ZZ Prova', status: 'bozza',
    blocks: [
      { id: 'b1', type: 'offerte', data: {} },
      { id: 'b2', type: 'booking', data: {} },
    ],
  }).select().single(); pag = p.id

  console.log('\nI BLOCCHI CHIEDONO COSA MOSTRARE\n')

  await withProbeSession(async ({ page }) => {
    const errori = []
    page.on('pageerror', x => errori.push('ECCEZIONE: ' + x.message))
    await page.goto(`${L}/admin/pagine/${pag}`, { waitUntil: 'networkidle' }).catch(() => {})
    await page.waitForTimeout(4000)

    // ⚠️ I blocchi nell'editor sono chiusi: vanno aperti cliccandoci sopra.
    // Senza, si legge la lista dei nomi e sembra che non abbiano configurazione.
    // ⚠️ E si clicca **dentro l'area dell'editor**: «Offerte» è anche una voce
    // del menu laterale, e cliccando quella si finisce su un'altra pagina —
    // sembra che il blocco non si apra, e invece si sta guardando altrove.
    // ⚠️ Si apre **un blocco alla volta**: aprendo il secondo il primo si
    // richiude. Quindi si legge subito dopo ogni apertura, invece di aprirli
    // tutti e leggere alla fine — che è come non aver aperto il primo.
    const editor = page.locator('.admin-main')
    const apriELeggi = async nome => {
      await editor.getByText(nome, { exact: true }).first().click().catch(() => {})
      await page.waitForTimeout(2000)
      return page.locator('.admin-main').innerText()
    }

    const testoOfferte = await apriELeggi('Offerte')
    const testoBooking = await apriELeggi('Widget prenotazione')
    const testo = testoOfferte + '\n' + testoBooking
    // Se si legge ancora questa frase, una scorciatoia sta intercettando il
    // blocco prima del suo editor.
    ok(!/nessuna configurazione necessaria/.test(testo),
       'nessun blocco dice più «nessuna configurazione necessaria»')
    ok(/Titolo sezione/.test(testo), 'l\'editor mostra il titolo della sezione')
    ok(/Quali mostrare/.test(testo), 'il blocco Offerte chiede quali mostrare')
    // L'anteprima di cosa comparirà: senza, il blocco resta un mistero finché
    // non si pubblica.
    ok(/ZZ Corso di prova/.test(testo), 'e dice quali offerte compariranno')
    ok(/rester(à|a) invisibile|Si potranno prenotare/.test(testo),
       'il widget prenotazione dice cosa succederà, invece di sparire in silenzio')
    ok(errori.length === 0, `nessun errore nel browser${errori.length ? ': ' + errori.slice(0, 2).join(' | ') : ''}`)
  }, { width: 1400, height: 1000 })

  console.log('\n' + '-'.repeat(62))
  console.log(ko ? `  ${ko} PROBLEMI` : '  I BLOCCHI SI CONFIGURANO, E DICONO COSA COMPARIRÀ')
} catch (e) { console.error('ERRORE:', e.message); ko++ }
finally {
  if (pag) await admin.from('pagine').delete().eq('id', pag)
  if (en) { await admin.from('offerte').delete().eq('entity_id', en); await admin.from('entita').delete().eq('id', en) }
  if (az) { const { error } = await admin.from('aziende').delete().eq('id', az); if (error) console.error('pulizia:', error.message) }
  console.log('[probe] pulito')
  process.exit(ko ? 1 : 0)
}
