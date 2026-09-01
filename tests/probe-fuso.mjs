// «Le 10:00» di chi, esattamente?
//
// Un'ora scritta su una prenotazione non è un istante finché non si sa dove.
// `new Date('2026-09-04T10:00')` la legge nel fuso di CHI ESEGUE, e Vercel
// esegue in UTC: per un'attività italiana quelle 10:00 diventavano le 12:00, il
// promemoria «24 ore prima» partiva due ore prima del dovuto e il termine per
// disdire si spostava della stessa quantità.
//
// ⚠️ Il difetto è invisibile in locale, dove il server ha l'ora italiana e i
// conti tornano da soli. Si vede solo provando dove gira davvero.
//
// Uso: cd tests && node probe-fuso.mjs
import { istanteDi, fusoSicuro, fusoValido, FUSO_PREDEFINITO } from '../client-next/lib/fuso.js'

let problemi = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) problemi++ }

// Come si legge quell'istante per chi sta lì: è la verifica che conta, perché è
// quello che vede il cliente sul proprio orologio.
const li = (istante, fuso) => istante.toLocaleString('it-IT', {
  timeZone: fuso, hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit',
})

console.log('\nL\'ORA CHE SCRIVE IL CLIENTE È QUELLA CHE VEDE LUI\n')
for (const [data, ora, fuso, nota] of [
  ['2026-09-04', '10:00', 'Europe/Rome',       'estate italiana (+2)'],
  ['2026-12-04', '10:00', 'Europe/Rome',       'inverno italiano (+1)'],
  ['2026-09-04', '10:00', 'America/New_York',  'New York (-4)'],
  ['2026-09-04', '10:00', 'Asia/Tokyo',        'Tokyo (+9)'],
  ['2026-09-04', '10:00', 'Australia/Adelaide','Adelaide (+9:30, mezz\'ora)'],
]) {
  const i = istanteDi(data, ora, fuso)
  const riletto = li(i, fuso)
  ok(riletto.includes(ora), `${fuso.padEnd(19)} ${data} ${ora} → lì sono le ${riletto.split(', ')[1]}  (${nota})`)
}

console.log('\nI DUE GIORNI ALL\'ANNO IN CUI L\'OROLOGIO SALTA\n')
// In Italia l'ora legale è finita il 25/10/2026 alle 3:00. Un'ora subito prima e
// una subito dopo cadono su scarti diversi: con un conto solo, uno dei due esce
// sbagliato di un'ora.
for (const [data, ora] of [['2026-10-24', '23:30'], ['2026-10-25', '05:30'], ['2026-03-29', '05:30']]) {
  const i = istanteDi(data, ora, 'Europe/Rome')
  ok(li(i, 'Europe/Rome').includes(ora), `${data} ${ora} resta ${ora} anche a cavallo del cambio`)
}

console.log('\nUNA STRINGA INVENTATA NON DEVE FAR SALTARE NIENTE\n')
// ⚠️ Un nome di fuso finisce dentro `Intl`, che su un valore inesistente lancia:
// senza questo muro una prenotazione risponderebbe 500.
ok(fusoValido('Europe/Rome'), 'un fuso vero è valido')
ok(!fusoValido('Fuso/Inventato'), 'uno inventato non lo è')
ok(!fusoValido("'; drop table--"), 'e nemmeno una stringa ostile')
ok(fusoSicuro('Fuso/Inventato') === FUSO_PREDEFINITO, `in mancanza si torna al predefinito (${FUSO_PREDEFINITO}), mai al valore ricevuto`)
ok(istanteDi('2026-09-04', '10:00', 'Fuso/Inventato') instanceof Date, 'e il conto si fa lo stesso, senza eccezioni')

console.log('\nIL PROMEMORIA CADE 24 ORE PRIMA DAVVERO\n')
const visita = istanteDi('2026-09-04', '10:00', 'Europe/Rome')
const promemoria = new Date(visita.getTime() - 24 * 3_600_000)
ok(li(promemoria, 'Europe/Rome').includes('10:00'),
   `visita alle 10:00 del 4 → promemoria alle ${li(promemoria, 'Europe/Rome')}`)

console.log('\n' + '─'.repeat(64))
console.log(problemi ? `${problemi} PROBLEMI` : 'L\'ORA È QUELLA DEL CLIENTE, NON DEL SERVER')
process.exit(problemi ? 1 : 0)
