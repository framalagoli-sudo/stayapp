import { supabaseAdmin } from './supabase-server'
import { ENTITY_TABLES } from './server-auth'
import { assicuraSottodominio, registraSottodominio } from './create-subdomain'
import { diagnosticaDominio, verifyProjectDomain, addProjectDomain, removeProjectDomain, vercelReady } from './vercel-domains'

// Manutenzione dei domini: tiene allineato ciò che è scritto nel DB con ciò che
// succede davvero in rete. Serve perché tre cose si muovono in modo indipendente:
// lo slug dell'entità (lo cambia il cliente), il DNS (lo cambia il suo provider)
// e il certificato (lo emette Vercel quando gli pare). Usata dal cron e dalla
// riparazione manuale.

// Slug attuale dell'entità: l'unica verità su dove puntare il dominio.
export async function slugVivo(entity_tipo, entity_id) {
  const table = ENTITY_TABLES[entity_tipo]
  if (!table || !entity_id) return null
  const { data } = await supabaseAdmin.from(table).select('slug').eq('id', entity_id).maybeSingle()
  return data?.slug ?? null
}

// entity_slug nella tabella domini è solo una copia di comodo: quando il cliente
// rinomina l'entità si disallinea e il dominio finirebbe su una pagina inesistente.
// Qui la si riporta al valore vero.
export async function riallineaSlug(record) {
  const vivo = await slugVivo(record.entity_tipo, record.entity_id)
  if (!vivo || vivo === record.entity_slug) return { cambiato: false, slug: vivo }
  await supabaseAdmin.from('domini')
    .update({ entity_slug: vivo, updated_at: new Date().toISOString() })
    .eq('id', record.id)
  return { cambiato: true, slug: vivo, precedente: record.entity_slug }
}

// Da chiamare quando il cliente rinomina un'entità: i domini collegati devono
// seguire subito, senza aspettare il giro del cron.
export async function sincronizzaSlugDomini(entity_tipo, entity_id, nuovoSlug) {
  if (!nuovoSlug) return
  await supabaseAdmin.from('domini')
    .update({ entity_slug: nuovoSlug, updated_at: new Date().toISOString() })
    .eq('entity_tipo', entity_tipo).eq('entity_id', entity_id)
}

// Toglie un hostname dal progetto Vercel. Un dominio che là non c'è più è un
// successo, non un errore: quello che ci interessa è che alla fine sia libero.
// Distinguerlo conta perché sull'esito si decide se cancellare la riga.
async function liberaHostname(nome) {
  if (!nome) return { ok: true, motivo: 'niente da togliere' }
  if (!vercelReady()) return { ok: false, motivo: 'Vercel non configurato' }
  const r = await removeProjectDomain(nome)
  if (r.ok) return { ok: true, motivo: 'rimosso' }
  if (r.status === 404 || /not.?found/i.test(r.error || '')) return { ok: true, motivo: 'già libero' }
  return { ok: false, motivo: r.error || `HTTP ${r.status}` }
}

// Una riga che non si è riusciti a liberare deve tornare nel giro del cron, che
// guarda solo i domini NON attivi (`soloPendenti`). Lasciandola 'attivo'
// resterebbe lì per sempre senza che nessuno la riprenda: il record esiste ma
// non lo controlla più nessuno, che è il modo elegante di perdere un problema.
// 'errore' esiste già fra i valori ammessi e descrive esattamente il fatto.
async function segnaDaRimuovere(record, motivo) {
  await supabaseAdmin.from('domini').update({
    stato: 'errore',
    verifica_dettaglio: { fase: 'hostname_non_liberato', motivo, entita_cancellata: true },
    ultima_verifica: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', record.id)
}

// ⚠️ La riga nella tabella `domini` è l'UNICA memoria che quell'hostname è
// nostro: cancellarla senza aver liberato Vercel lo rende invisibile per
// sempre, e nessuna query potrà più accorgersene. È successo davvero —
// `futura-club-spiagge-bianche.oltrenova.com` è rimasto agganciato al progetto
// mentre nel database non esisteva alcuna riga che lo nominasse.
//
// Quindi l'ordine è sempre questo, ovunque si cancelli: prima si stacca
// l'hostname (e il suo gemello apex/www), e solo se ci si è riusciti si toglie
// la riga. Quello che non si stacca resta scritto e marcato, così il giro
// successivo lo ritrova.
async function staccaERimuoviRiga(record) {
  const principale = await liberaHostname(record.dominio)
  const gemello = record.variante_dominio ? await liberaHostname(record.variante_dominio) : { ok: true }
  if (principale.ok && gemello.ok) {
    await supabaseAdmin.from('domini').delete().eq('id', record.id)
    return { ok: true }
  }
  const motivo = principale.ok ? gemello.motivo : principale.motivo
  await segnaDaRimuovere(record, motivo)
  return { ok: false, motivo }
}

export async function rimuoviDominiEntita(entity_tipo, entity_id) {
  const { data: records } = await supabaseAdmin.from('domini').select('*')
    .eq('entity_tipo', entity_tipo).eq('entity_id', entity_id)

  const rimasti = []
  for (const r of records || []) {
    const esito = await staccaERimuoviRiga(r)
    if (!esito.ok) rimasti.push({ dominio: r.dominio, motivo: esito.motivo })
  }
  return { rimasti }
}

// Cancellare un'azienda porta via le sue entità e le righe `domini` in cascata
// (migration 035), tutto in un colpo e senza che nessuno chiami Vercel: gli
// hostname resterebbero agganciati al progetto e — sparita l'unica riga che li
// nominava — invisibili per sempre. Perciò si liberano PRIMA, e chi non si
// riesce a liberare torna indietro come elenco: la cancellazione dell'azienda
// non deve partire, perché dopo non ci sarebbe più modo di accorgersene.
export async function rimuoviDominiAzienda(azienda_id) {
  const { data: records } = await supabaseAdmin.from('domini').select('*').eq('azienda_id', azienda_id)

  const rimasti = []
  for (const r of records || []) {
    const esito = await staccaERimuoviRiga(r)
    if (!esito.ok) rimasti.push({ dominio: r.dominio, motivo: esito.motivo })
  }
  return { rimasti }
}

// Ricontrolla un dominio dal vivo e salva l'esito. Ritorna il record aggiornato.
export async function ricontrolla(record) {
  const diagnosi = await diagnosticaDominio(record.dominio)

  // Domini collegati prima che registrassimo la coppia apex/www: il gemello va
  // agganciato ora, così appena il cliente aggiunge il record DNS funziona senza
  // bisogno di altri interventi da parte nostra.
  if (record.tipo === 'custom' && !record.variante_dominio && diagnosi.gemello && vercelReady()) {
    const g = await addProjectDomain(diagnosi.gemello.dominio, { redirect: record.dominio })
    if (g.ok) {
      await supabaseAdmin.from('domini').update({ variante_dominio: diagnosi.gemello.dominio }).eq('id', record.id)
      record.variante_dominio = diagnosi.gemello.dominio
    }
  }

  // Un dominio che risulta non registrato su Vercel non si collegherà mai: è il
  // caso dei sottodomini creati prima che li registrassimo davvero. Si recupera
  // registrandolo ora, senza chiedere niente al cliente.
  if (!diagnosi.registrato_su_vercel && vercelReady()) {
    const esito = await registraSottodominio(record.dominio)
    if (esito.registrato) {
      const nuova = await diagnosticaDominio(record.dominio)
      return await salvaEsito(record, nuova)
    }
  }

  // Registrato ma non ancora verificato: è il caso in cui il cliente ha appena
  // aggiunto il TXT di proprietà. Chiediamo a Vercel di ricontrollare subito,
  // altrimenti resterebbe in attesa fino al suo giro automatico.
  if (diagnosi.registrato_su_vercel && !diagnosi.verificato && vercelReady()) {
    const v = await verifyProjectDomain(record.dominio)
    if (v.ok) return await salvaEsito(record, await diagnosticaDominio(record.dominio))
  }

  return await salvaEsito(record, diagnosi)
}

async function salvaEsito(record, diagnosi) {
  const { data } = await supabaseAdmin.from('domini').update({
    stato: diagnosi.stato,
    vercel_domain_id: diagnosi.registrato_su_vercel ? record.dominio : null,
    dns_istruzioni: { records: diagnosi.records, verifica_txt: diagnosi.verifica_txt },
    verifica_dettaglio: diagnosi,
    ultima_verifica: diagnosi.controllato_il,
    updated_at: new Date().toISOString(),
  }).eq('id', record.id).select().single()
  return data
}

// Passata di manutenzione. `soloPendenti` limita il lavoro ai domini non ancora
// attivi (uso normale del cron); a passata piena si ricontrolla tutto.
// `limite` tiene il giro dentro il tempo massimo della route: ogni dominio costa
// fino a una decina di secondi fra chiamate a Vercel e prova HTTPS, e quel che
// resta indietro viene ripreso al giro successivo.
export async function manutenzioneDomini({ soloPendenti = true, limite = 10 } = {}) {
  const esito = { controllati: 0, riallineati: 0, riparati: 0, orfani_rimossi: 0, attivi: 0, problemi: [] }

  let q = supabaseAdmin.from('domini').select('*').order('ultima_verifica', { ascending: true, nullsFirst: true }).limit(limite)
  if (soloPendenti) q = q.neq('stato', 'attivo')
  const { data: records, error } = await q
  if (error) throw new Error(error.message)

  for (const record of records || []) {
    // Entità cancellata → il record non ha più senso e tiene occupato un
    // hostname. ⚠️ Prima si libera Vercel, POI si cancella la riga: al
    // contrario — com'era fin qui — l'hostname resta agganciato al progetto e
    // sparisce l'unica traccia che fosse nostro. Se Vercel non risponde, la
    // riga resta e si riprova al giro dopo: un record in più è recuperabile,
    // un hostname invisibile no.
    const vivo = await slugVivo(record.entity_tipo, record.entity_id)
    if (!vivo) {
      const r = await staccaERimuoviRiga(record)
      if (r.ok) esito.orfani_rimossi++
      else esito.problemi.push({ dominio: record.dominio, fase: 'hostname_non_liberato', motivo: r.motivo })
      continue
    }
    if (vivo !== record.entity_slug) {
      await riallineaSlug(record)
      esito.riallineati++
      record.entity_slug = vivo
    }

    const primaEraRegistrato = !!record.vercel_domain_id
    const aggiornato = await ricontrolla(record)
    esito.controllati++
    if (aggiornato?.stato === 'attivo') esito.attivi++
    if (!primaEraRegistrato && aggiornato?.vercel_domain_id) esito.riparati++
    if (aggiornato && aggiornato.stato !== 'attivo') {
      esito.problemi.push({ dominio: record.dominio, fase: aggiornato.verifica_dettaglio?.fase })
    }
  }

  // ── Righe la cui entità non esiste più ──────────────────────────────────────
  // Il giro qui sopra non basta: `soloPendenti` guarda solo i domini NON
  // attivi, e un sottodominio nasce già 'attivo' perché Vercel lo verifica
  // subito (sta sotto un dominio che è nostro). Quindi un'entità cancellata
  // direttamente nel database — le sonde lo fanno, e una query a mano pure —
  // lascia una riga che nessuno riguarderà mai e un hostname agganciato al
  // progetto che, sparita la riga, nessuno potrà più trovare. È così che se ne
  // erano accumulati 56.
  //
  // Qui non si fa diagnostica: si chiede solo se l'entità c'è ancora. Sono
  // poche righe e nessuna chiamata di rete per quelle sane, quindi può girare
  // per intero a ogni passata senza pesare.
  const { data: tutte } = await supabaseAdmin.from('domini').select('*').limit(500)
  for (const record of tutte || []) {
    if (await slugVivo(record.entity_tipo, record.entity_id)) continue
    const r = await staccaERimuoviRiga(record)
    if (r.ok) esito.orfani_rimossi++
    else esito.problemi.push({ dominio: record.dominio, fase: 'hostname_non_liberato', motivo: r.motivo })
  }

  // Entità rimaste senza indirizzo incluso (create quando la registrazione non
  // c'era ancora, o con Vercel irraggiungibile in quel momento).
  const { data: subEsistenti } = await supabaseAdmin.from('domini').select('entity_id').eq('tipo', 'subdomain')
  const conSub = new Set((subEsistenti || []).map(r => r.entity_id))
  for (const [entity_tipo, table] of Object.entries(ENTITY_TABLES)) {
    const { data: entita } = await supabaseAdmin.from(table).select('id, slug, azienda_id').not('slug', 'is', null)
    for (const e of entita || []) {
      if (conSub.has(e.id)) continue
      const creato = await assicuraSottodominio({ azienda_id: e.azienda_id, entity_tipo, entity_id: e.id, entity_slug: e.slug })
      if (creato) esito.riparati++
      else esito.problemi.push({ entita: e.slug, fase: 'sottodominio_non_creato' })
    }
  }

  return esito
}
