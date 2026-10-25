// Sonda: nelle email quello che scrive un visitatore resta TESTO.
//
// Fino al 25/10/2026 i modelli delle email (lib/email-template.js) mettevano i
// valori nell'HTML così com'erano: un nome o un messaggio con dentro un link
// arrivava al titolare — o, nella lista d'attesa e nella newsletter, a un
// indirizzo scelto dall'attaccante — con la grafica del locale e dal nostro
// dominio. Ora i modelli fanno l'escape di tutto e l'HTML voluto si dichiara
// con html`…`. Questa sonda prova i modelli veri con gli input di un
// attaccante. Non usa la rete.
//
// Uso: cd tests && node probe-email-sicure.mjs
import { emailTemplate, guestEmailTemplate, platformEmailTemplate, html, htmlGiaPulito, aCapo } from '../client-next/lib/email-template.js'
let rossi = 0
const ok = (c, cosa) => { if (!c) rossi++; console.log(`${c ? '✓' : '✗'} ${cosa}`) }
const OSTILE = '<a href="https://evil.example/login">Il tuo account scade, clicca</a><img src=x onerror=alert(1)>'
const e1 = emailTemplate({ title: 'Nuovo messaggio', entityName: 'Bar & Bistrot', appUrl: 'https://oltrenova.com',
  rows: [{ label: 'Nome', value: OSTILE }, { label: 'Messaggio', value: aCapo('riga uno\n' + OSTILE) }] })
ok(!e1.includes('<a href="https://evil') && !e1.includes('<img src=x'), 'righe: il link e l’immagine dell’attaccante restano testo')
ok(e1.includes('&lt;a href=&quot;https://evil'), 'righe: si vede come testo, escapato una volta sola')
ok(e1.includes('riga uno<br>&lt;a'), 'aCapo: a-capo diventa <br>, il resto è testo')
ok(e1.includes('Bar &amp; Bistrot') && !e1.includes('&amp;amp;'), 'nome del locale con «&»: un solo escape')
const e2 = guestEmailTemplate({ entityName: 'Garage 22', title: 'Ti abbiamo messo in lista',
  intro: html`Ciao ${OSTILE}, sei in lista per <strong>${'Serata <jazz>'}</strong>.`, rows: [] , ctaText: 'Paga', ctaUrl: 'javascript:alert(1)' })
ok(e2.includes('<strong>Serata &lt;jazz&gt;</strong>'), 'html``: il grassetto resta, il titolo è testo')
ok(!e2.includes('<a href="https://evil'), 'html``: il nome dell’attaccante resta testo')
ok(!e2.includes('javascript:'), 'pulsante con javascript: → nessun link pericoloso')
const righe = ['<b>uno</b>', 'due'].map(x => html`<tr><td>${x}</td></tr>`)
const e3 = guestEmailTemplate({ entityName: 'X', title: 'Ordine', bodyHtml: html`<table>${righe}</table>` })
ok(e3.includes('<table><tr><td>&lt;b&gt;uno&lt;/b&gt;</td></tr><tr><td>due</td></tr></table>'), 'elenco di html`` dentro html``: le righe restano righe')
const e4 = platformEmailTemplate({ title: 'Resoconto', intro: htmlGiaPulito('Ecco per <strong>Bar &amp; Bistrot</strong>.'), footerNote: 'testo con <strong>tag</strong>' })
ok(e4.includes('<strong>Bar &amp; Bistrot</strong>'), 'htmlGiaPulito passa com’è')
ok(e4.includes('testo con &lt;strong&gt;tag&lt;/strong&gt;'), 'una stringa normale con tag (dimenticata) resta testo: brutta, innocua')
const e5 = guestEmailTemplate({ entityName: 'X', title: 'T', intro: html`${''}${null}${undefined}fine`, rows: [{ label: 'Posti', value: 3 }] })
ok(e5.includes('>fine</p>') && e5.includes('>3</td>'), 'valori vuoti e numeri')
console.log(rossi ? `\n${rossi} ROSSI` : '\ntutto verde'); process.exitCode = rossi ? 1 : 0
