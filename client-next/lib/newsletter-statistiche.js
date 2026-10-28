import { supabaseAdmin } from './supabase-server.js'

// Com'è andata una newsletter. Gli eventi arrivano da Resend (webhook) e si
// agganciano alla riga scritta all'invio (`newsletter_destinatari.resend_id`).
// Si conta la PRIMA volta di ogni cosa: il resoconto parla di persone.

const COLONNA = {
  'email.delivered':  'consegnata_il',
  'email.opened':     'aperta_il',
  'email.clicked':    'cliccata_il',
  'email.bounced':    'rimbalzata_il',
  'email.complained': 'spam_il',
}

export const eventoStatistica = type => type in COLONNA

// Il link premuto: solo http(s), senza il link per disiscriversi (non è un
// interesse, e ha dentro il token della persona).
function linkPulito(link) {
  try {
    const u = new URL(String(link || ''))
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    if (u.pathname.startsWith('/unsubscribe')) return null
    return u.toString().slice(0, 2000)
  } catch { return null }
}

export async function registraEvento(type, data) {
  const colonna = COLONNA[type]
  const resendId = typeof data?.email_id === 'string' ? data.email_id : null
  if (!colonna || !resendId) return
  const { data: riga } = await supabaseAdmin.from('newsletter_destinatari')
    .select('id, newsletter_id, aperta_il').eq('resend_id', resendId).maybeSingle()
  // Non è una newsletter (conferme, prenotazioni…) o è partita prima delle statistiche.
  if (!riga) return

  const ora = new Date().toISOString()
  await supabaseAdmin.from('newsletter_destinatari').update({ [colonna]: ora }).eq('id', riga.id).is(colonna, null)

  if (type === 'email.clicked') {
    // Chi clicca l'ha aperta, anche se il suo programma ha bloccato le immagini
    // e l'apertura non è mai stata segnalata: è la regola di Mailchimp e MailUp.
    if (!riga.aperta_il) await supabaseAdmin.from('newsletter_destinatari').update({ aperta_il: ora }).eq('id', riga.id).is('aperta_il', null)
    const link = linkPulito(data?.click?.link)
    if (link) {
      await supabaseAdmin.from('newsletter_clic')
        .upsert({ destinatario_id: riga.id, newsletter_id: riga.newsletter_id, link }, { onConflict: 'destinatario_id,link', ignoreDuplicates: true })
    }
  }
}

/**
 * Il resoconto di una newsletter già controllata (azienda della persona che chiede).
 * `conNomi`: false per chi non può leggere i contatti — riceve solo i numeri.
 */
export async function statisticheNewsletter(nl, { conNomi }) {
  const righe = []
  for (let da = 0; ; da += 1000) {
    const { data, error } = await supabaseAdmin.from('newsletter_destinatari')
      .select('id, contatto_id, consegnata_il, aperta_il, cliccata_il, rimbalzata_il, spam_il')
      .eq('newsletter_id', nl.id).range(da, da + 999)
    if (error) throw new Error(error.message)
    righe.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  const { data: clic } = await supabaseAdmin.from('newsletter_clic')
    .select('destinatario_id, link').eq('newsletter_id', nl.id).limit(5000)

  const conta = col => righe.filter(r => r[col]).length
  const perLink = {}
  for (const c of clic || []) perLink[c.link] = (perLink[c.link] || 0) + 1

  const risultato = {
    tracciata: righe.length > 0,
    inviate: nl.recipients_count || 0,
    consegnate: conta('consegnata_il'),
    aperte: conta('aperta_il'),
    cliccate: conta('cliccata_il'),
    rimbalzate: conta('rimbalzata_il'),
    spam: conta('spam_il'),
    disiscritti: nl.unsubscribes_count || 0,
    link: Object.entries(perLink).map(([link, persone]) => ({ link, persone })).sort((a, b) => b.persone - a.persone),
  }
  if (!conNomi || !righe.length) return risultato

  const ids = [...new Set(righe.map(r => r.contatto_id))]
  const nomi = {}
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await supabaseAdmin.from('contatti').select('id, nome, email')
      .eq('azienda_id', nl.azienda_id).in('id', ids.slice(i, i + 200))
    for (const c of data || []) nomi[c.id] = c
  }
  const linkDi = {}
  for (const c of clic || []) (linkDi[c.destinatario_id] ||= []).push(c.link)
  risultato.persone = righe.map(r => ({
    contatto_id: r.contatto_id,
    nome: nomi[r.contatto_id]?.nome || '',
    email: nomi[r.contatto_id]?.email || '',
    aperta: !!r.aperta_il, cliccata: !!r.cliccata_il, rimbalzata: !!r.rimbalzata_il, spam: !!r.spam_il,
    link: linkDi[r.id] || [],
  }))
  return risultato
}
