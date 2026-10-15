// I resoconti per email ai titolari (STRATEGIA.md §6.4 punto 3): il lunedì la
// settimana prima, il 1° del mese il mese prima. Sono i numeri del cruscotto
// della Dashboard — `cruscottoTra`, la stessa regola — mandati a chi
// amministra l'azienda, perché veda cosa gli rende senza dover aprire il pannello.
//
// ⛔ Partono solo con `platform_config.resoconti_attivi` acceso: lo decide il
// proprietario della piattaforma, non il codice.
//
// ⚠️ Escono solo conteggi e somme, mai nomi di persone (come il cruscotto). Il
// nome di un evento sì: è pubblico.
//
// Solo server.
import { supabaseAdmin } from './supabase-server'
import { cruscottoTra } from './cruscotto'
import { consigliPer } from './consigli'
import { platformEmailTemplate, escEmail as esc } from './email-template'
import { sendEmail } from './send-email'
import { fusoSicuro, giornoLocale, istanteDi, oraLocale } from './fuso'
import { TIPI_RESOCONTO, vuoleIlTipo } from './resoconti-regole'
import { logError } from './observability'

const PANNELLO = 'https://www.oltrenova.com/admin'
// Dalle 8 del mattino, nel fuso dell'azienda: un resoconto alle tre di notte
// finisce sotto venti email arrivate dopo.
const ORA_DI_INVIO = 8

const euro = n => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n || 0)
const intero = n => new Intl.NumberFormat('it-IT').format(n || 0)

// Aritmetica sui giorni scritti «2026-10-12», senza passare da un fuso.
const spostaGiorni = (giorno, n) => {
  const d = new Date(`${giorno}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  // regola-ok: il giorno è già quello locale (scritto); UTC qui è solo un calendario per contare
  return d.toISOString().slice(0, 10)
}
const primoDelMese = (giorno, mesiIndietro = 0) => {
  const d = new Date(`${giorno.slice(0, 7)}-01T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() - mesiIndietro)
  // regola-ok: il giorno è già quello locale (scritto); UTC qui è solo un calendario per contare
  return d.toISOString().slice(0, 10)
}

// «dal 5 all'11 ottobre», «dal 29 settembre al 5 ottobre». Lavora sui giorni
// scritti, quindi non ha fuso: il fuso è già servito a sceglierli.
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']
const conVocale = n => n === 8 || n === 11
function daA(primo, ultimo) {
  const [, m1, g1] = primo.split('-').map(Number)
  const [, m2, g2] = ultimo.split('-').map(Number)
  const dal = conVocale(g1) ? `dall'${g1}` : `dal ${g1}`
  const al = conVocale(g2) ? `all'${g2}` : `al ${g2}`
  return m1 === m2 ? `${dal} ${al} ${MESI[m2 - 1]}` : `${dal} ${MESI[m1 - 1]} ${al} ${MESI[m2 - 1]}`
}

function oraDelGiorno(adesso, fuso) {
  const h = new Intl.DateTimeFormat('en-GB', { timeZone: fusoSicuro(fuso), hour: '2-digit', hourCycle: 'h23' }).format(adesso)
  return Number(h)
}

// L'ultimo periodo concluso di quel tipo, nel fuso dell'azienda, e se oggi è
// il giorno (e l'ora) di mandarlo. `chiave` è il nome del periodo nel registro.
export function periodo(tipo, adesso = new Date(), fuso) {
  const oggi = giornoLocale(adesso, fuso)
  const ora = oraDelGiorno(adesso, fuso)
  const mezzanotte = g => istanteDi(g, '00:00', fuso).toISOString()
  if (tipo === 'settimanale') {
    const dow = new Date(`${oggi}T00:00:00Z`).getUTCDay() // 0 = domenica
    const lunedi = spostaGiorni(oggi, -((dow + 6) % 7))
    const da = spostaGiorni(lunedi, -7)
    return {
      tipo, chiave: da,
      inizio: mezzanotte(spostaGiorni(lunedi, -14)), meta: mezzanotte(da), fine: mezzanotte(lunedi),
      etichetta: daA(da, spostaGiorni(lunedi, -1)),
      dovuto: dow === 1 && ora >= ORA_DI_INVIO,
    }
  }
  const primo = primoDelMese(oggi)
  const da = primoDelMese(oggi, 1)
  return {
    tipo, chiave: da.slice(0, 7),
    inizio: mezzanotte(primoDelMese(oggi, 2)), meta: mezzanotte(da), fine: mezzanotte(primo),
    etichetta: new Date(`${da}T12:00:00Z`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    dovuto: oggi === primo && ora >= ORA_DI_INVIO,
  }
}

const PAROLE = {
  settimanale: { rispetto: 'rispetto alla settimana prima', come: 'come la settimana prima', prima: 'la settimana prima' },
  mensile: { rispetto: 'rispetto al mese prima', come: 'come il mese prima', prima: 'il mese prima' },
}

function confronto(ora, prima, tipo) {
  const p = PAROLE[tipo]
  if (ora === prima) return ora ? p.come : ''
  // Su numeri piccoli la percentuale inganna (da 2 a 1 è «-50%»): meglio il numero.
  if (prima < 10) return `${p.prima}: ${intero(prima)}`
  const diff = Math.round((ora - prima) / prima * 100)
  return `${diff > 0 ? '+' : ''}${diff}% ${p.rispetto}`
}

// Niente da raccontare: nessuna visita, nessun contatto, nessuna prenotazione,
// nessun incasso, nessuna recensione nuova.
export const vuoto = d =>
  !d.visite.ora && !d.contatti.ora && !d.prenotazioni?.ora && !d.incassi?.ora && !d.recensioni?.ora

// Il nome con cui si parla all'azienda: la sua attività, se ne ha una sola.
async function nomeAzienda(aziendaId) {
  const [{ data: az }, { data: ent }] = await Promise.all([
    supabaseAdmin.from('aziende').select('ragione_sociale, fuso_orario').eq('id', aziendaId).maybeSingle(),
    supabaseAdmin.from('entita').select('name').eq('azienda_id', aziendaId).limit(2),
  ])
  return {
    nome: (ent?.length === 1 && ent[0].name) || az?.ragione_sociale || 'la tua attività',
    fuso: az?.fuso_orario || null,
    entita: ent?.length || 0,
  }
}

// Riga della tabella: etichetta, numero grande, confronto piccolo sotto.
const riga = (etichetta, valore, nota) => `<tr>
  <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#555;vertical-align:top">${esc(etichetta)}</td>
  <td style="padding:12px 0 12px 12px;border-bottom:1px solid #f0f0f0;text-align:right;vertical-align:top">
    <div style="font-size:20px;font-weight:700;color:#1a1a2e">${esc(valore)}</div>
    ${nota ? `<div style="font-size:12px;color:#6b6b76;margin-top:2px">${esc(nota)}</div>` : ''}
  </td></tr>`

// L'email di un periodo, pronta da mandare. `consiglio` facoltativo.
export function componiResoconto({ nome, dati, periodo: per, consiglio, fuso }) {
  const t = per.tipo
  const righe = [
    riga('Visite ai tuoi siti', intero(dati.visite.ora), confronto(dati.visite.ora, dati.visite.prima, t)),
    riga('Contatti nuovi', intero(dati.contatti.ora),
      [confronto(dati.contatti.ora, dati.contatti.prima, t),
        `${intero(dati.contatti.invitabili)} in tutto possono ricevere le tue promozioni`].filter(Boolean).join(' · ')),
  ]
  if (dati.prenotazioni) righe.push(riga('Prenotazioni ricevute', intero(dati.prenotazioni.ora), confronto(dati.prenotazioni.ora, dati.prenotazioni.prima, t)))
  if (dati.incassi) {
    const p = PAROLE[t]
    righe.push(riga('Incassato online', euro(dati.incassi.ora),
      dati.incassi.ora === dati.incassi.prima ? (dati.incassi.ora ? p.come : '') : `${p.prima}: ${euro(dati.incassi.prima)}`))
  }
  if (dati.recensioni) {
    righe.push(riga('Recensioni', `${String(dati.recensioni.media).replace('.', ',')} su 5`,
      `${intero(dati.recensioni.ora)} ${dati.recensioni.ora === 1 ? 'nuova' : 'nuove'} · ${intero(dati.recensioni.totale)} in tutto`))
  }

  let evento = ''
  if (dati.prossimoEvento) {
    const e = dati.prossimoEvento
    const posti = e.capienza ? `${intero(e.prenotati)} posti prenotati su ${intero(e.capienza)}` : `${intero(e.prenotati)} prenotati`
    evento = `<div style="margin:22px 0 0;padding:14px 16px;background:#f6f7fb;border-radius:10px">
      <div style="font-size:12px;color:#6b6b76;text-transform:uppercase;letter-spacing:.04em">Il prossimo evento</div>
      <div style="font-size:15px;font-weight:600;color:#1a1a2e;margin-top:4px">${esc(e.titolo)}</div>
      <div style="font-size:13px;color:#555;margin-top:2px">${esc(oraLocale(e.quando, fuso, { weekday: 'long' }))} · ${esc(posti)}</div>
    </div>`
  }

  let suggerimento = ''
  if (consiglio) {
    const link = consiglio.azione?.link ? `https://www.oltrenova.com${consiglio.azione.link}` : null
    suggerimento = `<div style="margin:22px 0 0;padding:14px 16px;border:1px solid #e6e6ee;border-radius:10px">
      <div style="font-size:12px;color:#6b6b76;text-transform:uppercase;letter-spacing:.04em">Un consiglio</div>
      <div style="font-size:15px;font-weight:600;color:#1a1a2e;margin-top:4px">${esc(consiglio.titolo)}</div>
      ${consiglio.perche ? `<div style="font-size:14px;color:#555;margin-top:4px;line-height:1.6">${esc(consiglio.perche)}</div>` : ''}
      ${link ? `<div style="margin-top:8px"><a href="${esc(link)}" style="color:#1a1a2e;font-weight:600;font-size:14px">${esc(consiglio.azione.testo)} →</a></div>` : ''}
    </div>`
  }

  const settimana = t === 'settimanale'
  const oggetto = settimana
    ? `La settimana di ${nome}: ${intero(dati.visite.ora)} ${dati.visite.ora === 1 ? 'visita' : 'visite'}, ${intero(dati.contatti.ora)} ${dati.contatti.ora === 1 ? 'contatto nuovo' : 'contatti nuovi'}`
    : `${per.etichetta.charAt(0).toUpperCase()}${per.etichetta.slice(1)} di ${nome}: com'è andata`
  const html = platformEmailTemplate({
    title: settimana ? `La tua settimana, ${per.etichetta}` : `Il tuo mese: ${per.etichetta}`,
    intro: `Ecco com'è andata per <strong>${esc(nome)}</strong>.`,
    bodyHtml: `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px">${righe.join('')}</table>${evento}${suggerimento}`,
    ctaText: 'Apri il pannello',
    ctaUrl: PANNELLO,
    footerNote: `Ricevi questo resoconto ${settimana ? 'ogni settimana' : 'ogni mese'} perché amministri ${esc(nome)} su OltreNova. Per riceverlo con un'altra cadenza, o per non riceverlo più, scrivi a <a href="mailto:info@oltrenova.com" style="color:#6b6b76">info@oltrenova.com</a>.`,
  })
  return { oggetto, html }
}

// Tutto quello che serve per l'email di un'azienda, per l'ultimo periodo
// concluso di quel tipo. Usata dal giro di invio e dall'anteprima.
export async function resocontoDi(aziendaId, tipo, adesso = new Date()) {
  const az = await nomeAzienda(aziendaId)
  const per = periodo(tipo, adesso, az.fuso)
  const dati = await cruscottoTra(aziendaId, per)
  let consiglio = null
  try { consiglio = (await consigliPer(aziendaId))[0] || null } catch {}
  return { ...az, periodo: per, dati, consiglio, ...componiResoconto({ nome: az.nome, dati, periodo: per, consiglio, fuso: az.fuso }) }
}

// Chi riceve: chi amministra l'azienda (ogni quanto lo decide l'azienda, non la
// persona). Fuori gli account bloccati, senza email e — quando si manda
// davvero — quelli delle sonde (una simulazione non manda niente, quindi li può contare).
async function destinatari(aziendaId, { simula = false } = {}) {
  const { data, error } = await supabaseAdmin.from('profiles')
    .select('id').eq('azienda_id', aziendaId).eq('role', 'admin_azienda')
  if (error) throw new Error(error.message)
  const out = []
  for (const p of data || []) {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(p.id)
    const email = u?.user?.email
    const bloccato = u?.user?.banned_until && new Date(u.user.banned_until) > new Date()
    if (!email || bloccato || (!simula && /@playwright\.internal$/i.test(email))) continue
    out.push({ id: p.id, email })
  }
  return out
}

// I prossimi giorni di invio (da domani), come istanti di mezzogiorno UTC:
// in quel momento è già il giorno giusto e sono passate le 8 da Los Angeles a
// Tokyo. Servono alla simulazione «chi lo riceverebbe».
export function prossimiInvii(adesso = new Date()) {
  const domani = spostaGiorni(giornoLocale(adesso, 'Europe/Rome'), 1)
  const dow = new Date(`${domani}T00:00:00Z`).getUTCDay()
  const lunedi = spostaGiorni(domani, (8 - dow) % 7)
  const primo = domani.endsWith('-01') ? domani : primoDelMese(domani, -1)
  return {
    settimanale: { giorno: lunedi, istante: new Date(`${lunedi}T12:00:00Z`) },
    mensile: { giorno: primo, istante: new Date(`${primo}T12:00:00Z`) },
  }
}

// Il giro: per ogni azienda, i resoconti dovuti adesso nel suo fuso. Il
// registro si scrive PRIMA dell'invio: due giri sovrapposti non mandano due
// volte (il secondo trova la riga e salta). Se l'invio fallisce la riga si
// toglie, e il giro dell'ora dopo riprova — solo finché è ancora il giorno giusto.
//
// `simula`: lo stesso giro senza scrivere e senza mandare niente — dice solo a
// quali aziende e a quante persone partirebbe. `soloAzienda`: il giro su
// un'azienda sola (le sonde, su un'azienda di prova: il giro normale salta le «ZZ»).
export async function giroResoconti(adesso = new Date(), { simula = false, soloAzienda = null } = {}) {
  let q = supabaseAdmin.from('aziende').select('id, ragione_sociale, fuso_orario, resoconti')
  q = soloAzienda ? q.eq('id', soloAzienda) : q.not('ragione_sociale', 'ilike', 'ZZ%')
  const { data: aziende, error } = await q
  if (error) throw new Error(error.message)
  const esito = { aziende: 0, inviati: 0, gia: 0, vuoti: 0, falliti: 0, elenco: [] }
  for (const az of aziende || []) {
    // Il tipo scelto per l'azienda (dal cruscotto), e solo nel suo giorno.
    const dovuti = TIPI_RESOCONTO.filter(t => vuoleIlTipo(az.resoconti, t) && periodo(t, adesso, az.fuso_orario).dovuto)
    if (!dovuti.length) continue
    esito.aziende++
    for (const tipo of dovuti) {
      try {
        const chi = await destinatari(az.id, { simula })
        if (!chi.length) continue
        const r = await resocontoDi(az.id, tipo, adesso)
        if (!r.entita) continue
        // La settimana in cui non è successo niente non si racconta; il mese sì.
        const silenzio = tipo === 'settimanale' && vuoto(r.dati)
        if (simula) { esito.elenco.push({ azienda: az.ragione_sociale, tipo, persone: chi.length, parte: !silenzio }); continue }
        if (silenzio) { esito.vuoti++; continue }
        for (const p of chi) {
          const { error: e } = await supabaseAdmin.from('resoconti_inviati')
            .insert({ profile_id: p.id, azienda_id: az.id, tipo, periodo: r.periodo.chiave })
          if (e) { if (e.code === '23505') { esito.gia++; continue } throw new Error(e.message) }
          const inviato = await sendEmail({ _ctx: `resoconto-${tipo}`, to: p.email, subject: r.oggetto, html: r.html })
          if (inviato?.error) {
            esito.falliti++
            await supabaseAdmin.from('resoconti_inviati').delete()
              .eq('profile_id', p.id).eq('tipo', tipo).eq('periodo', r.periodo.chiave)
            await logError('cron/resoconti', `Resoconto ${tipo} non inviato (azienda ${az.id}): ${inviato.error.message}`, { alert: true })
          } else esito.inviati++
        }
      } catch (err) {
        esito.falliti++
        await logError('cron/resoconti', err, { alert: true })
      }
    }
  }
  return esito
}
