// Le regole delle opzioni di un evento (migration 148), senza rete né database:
// pulizia di quello che arriva dal pannello, conto con quote per opzione, posti
// per opzione (online e titolare), cosa esce al pubblico. Casi ostili compresi.
// Uso: cd tests && node probe-opzioni-regole.mjs
import { opzioniPulite, derivatiDaOpzioni, leggiScelte, contoScelte, rifiutoScelte, occupatiPerOpzione, opzioniPubbliche, riassuntoScelte, fraseQuota } from '../client-next/lib/opzioni-evento.js'
import { cosaComprende } from '../client-next/lib/prezzo-evento.js'
let ko = 0
const ok = (c, m, x = '') => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (c ? '' : '  → ' + JSON.stringify(x))); if (!c) ko++ }

const pulite = opzioniPulite([
  { id: 'cena', name: ' Cena & spettacolo ', price: '30', posti: 40, posti_riservati: 10, acconto_percentuale: 100, includes: ['cena', '<script>'], extra: 'via' },
  { id: 'bar', name: 'Ingresso + drink', price: 15, posti: 30, acconto_percentuale: 0 },
  { id: 'cena', name: 'doppione', price: 1 },
  { name: '', price: 5 },
  { id: '../x"', name: 'Id ostile', price: -20, posti: -3, posti_riservati: 99, acconto_percentuale: 500 },
])
ok(pulite.length === 4, 'tiene le opzioni con nome, scarta quella senza', pulite.length)
ok(pulite[0].name === 'Cena & spettacolo' && pulite[0].price === 30 && !('extra' in pulite[0]), 'solo i campi previsti, testo ripulito')
ok(JSON.stringify(pulite[0].includes) === '["cena"]', 'includes da catalogo chiuso', pulite[0].includes)
ok(pulite[2].id !== 'cena', 'id doppione rinominato', pulite[2].id)
ok(/^[A-Za-z0-9_-]+$/.test(pulite[3].id) && pulite[3].price === 0 && pulite[3].posti === 1 && pulite[3].posti_riservati === 1 && pulite[3].acconto_percentuale === 100, 'valori ostili riportati nei limiti', pulite[3])
const ev = { packages: pulite.slice(0, 2), acconto_percentuale: 20 }
const d = derivatiDaOpzioni(ev.packages)
ok(d.seats_total === 70 && d.posti_riservati === 10 && d.price === 15, 'totali calcolati: 70 posti, 10 al telefono, da 15', d)
ok(derivatiDaOpzioni([...ev.packages, { id: 'x', name: 'Libera', price: 5, posti: null }]).seats_total === 0, 'un’opzione senza limite → evento senza limite')

const l = leggiScelte(ev, [{ id: 'cena', quantita: 1 }, { id: 'bar', quantita: 2 }, { id: 'bar', quantita: 0 }])
ok(!l.errore && l.posti === 3 && l.scelte[0].prezzo === 30 && l.scelte[1].acconto === 0, '1 cena + 2 ingressi, prezzi dal listino', l)
ok(leggiScelte(ev, [{ id: 'cena', quantita: -2 }]).errore, 'quantità negativa rifiutata')
ok(leggiScelte(ev, [{ id: 'cena', quantita: 1.5 }]).errore, 'quantità non intera rifiutata')
ok(leggiScelte(ev, [{ id: 'inventata', quantita: 1 }]).errore, 'opzione inesistente rifiutata')
ok(leggiScelte(ev, [{ id: 'cena', quantita: 0 }]).errore, 'zero posti rifiutato')
ok(leggiScelte(ev, [{ id: 'cena', quantita: 1, prezzo: 0.01 }]).scelte[0].prezzo === 30, 'un prezzo mandato dal browser non conta')
ok(leggiScelte(ev, 'ciao').errore && leggiScelte(ev, [null]).errore, 'forme strane rifiutate')

const c = contoScelte(l.scelte)
ok(c.totale === 60 && c.conto.dovuto === 30 && c.conto.saldo === 30 && !c.conto.tutto, 'cena al 100% + 2 ingressi allo 0%: ora 30, sul posto 30', c)
ok(c.righe.length === 1 && c.righe[0].importo === 30 && c.righe[0].quantita === 1, 'alla cassa solo la cena', c.righe)
const c2 = contoScelte([{ id: 'a', nome: 'A', prezzo: 33.33, quantita: 3, acconto: 30 }])
ok(c2.conto.dovuto === 30 && c2.righe[0].importo === 10, 'acconto arrotondato per posto: 3 × 10 = 30', c2)
ok(contoScelte([{ id: 'a', nome: 'A', prezzo: 15, quantita: 2, acconto: 0 }]).conto.dovuto === 0, 'tutto sul posto → niente cassa')

const occ = occupatiPerOpzione([
  { status: 'confirmed', scelte: [{ id: 'cena', quantita: 28 }] },
  { status: 'pending', scelte: [{ id: 'cena', quantita: 2 }, { id: 'bar', quantita: 1 }] },
  { status: 'cancelled', scelte: [{ id: 'cena', quantita: 5 }] },
  { status: 'waitlist', scelte: [{ id: 'cena', quantita: 4 }] },
  { status: 'waitlist', offerta_scade_il: new Date(Date.now() + 3600e3).toISOString(), scelte: [{ id: 'bar', quantita: 2 }] },
  { status: 'confirmed', package_id: 'bar', seats: 3 },
])
ok(occ.cena === 30 && occ.bar === 6, 'conta chi occupa: annullate e lista fuori, offerte valide dentro, righe vecchie col pacchetto', occ)
ok(!rifiutoScelte(ev, [{ id: 'cena', quantita: 0 + 0 || 1 }], { cena: 29 }), 'cena: 40 − 10 telefono − 29 = 1 libero online, 1 passa')
const r = rifiutoScelte(ev, [{ id: 'cena', quantita: 2 }], { cena: 29 })
ok(r && r.posti_liberi === 1, 'online: 2 cene con 1 libera rifiutate', r)
ok(!rifiutoScelte(ev, [{ id: 'cena', quantita: 2 }], { cena: 29 }, { canale: 'titolare' }), 'il titolare usa i posti del telefono')
ok(rifiutoScelte(ev, [{ id: 'cena', quantita: 1 }], { cena: 30 })?.error.includes('esaurita'), 'online: cena esaurita (30 su 30 vendibili)')

const pub = opzioniPubbliche({ packages: ev.packages, opzioni_prenotate: { cena: 30, bar: 5 } })
ok(pub[0].posti_online === 0 && pub[1].posti_online === 25, 'pubblico: posti ancora prenotabili', pub)
const chiavi = Object.keys(pub[0]).sort().join(',')
ok(chiavi === 'description,id,includes,name,posti_online,price,quota', 'pubblico: niente capienza né posti per il telefono', chiavi)
ok(pub[0].quota === 0 && pub[1].quota === 0, 'senza conto che incassa la quota è 0 (si paga sul posto)', pub)
const conConto = opzioniPubbliche({ packages: ev.packages, acconto_percentuale: 20 }, { incassa: true })
ok(conConto[0].quota === 100 && conConto[1].quota === 0, 'con il conto: la quota di ogni opzione', conConto)
ok(opzioniPubbliche({ packages: [{ id: 'z', name: 'Z', price: 10, acconto_percentuale: null }], acconto_percentuale: 30 }, { incassa: true })[0].quota === 30, 'quota vuota = quella dell’evento')
ok(fraseQuota(0) === 'Si paga sul posto' && fraseQuota(100) === 'Si paga alla prenotazione' && fraseQuota(20) === '20% alla prenotazione, il resto sul posto', 'la frase della quota')
ok(cosaComprende({ comprende: 'Cena', packages: ev.packages }, null) === '', 'con le opzioni la riga generale «cosa comprende» non esce')
ok(cosaComprende({ comprende: 'Cena', packages: [] }, null) === 'Cena', 'senza opzioni sì, come prima')
ok(riassuntoScelte(l.scelte) === '1 × Cena & spettacolo · 2 × Ingresso + drink', 'riassunto leggibile', riassuntoScelte(l.scelte))
console.log(ko ? `\n${ko} DA GUARDARE` : '\ntutto verde')
process.exit(ko ? 1 : 0)
