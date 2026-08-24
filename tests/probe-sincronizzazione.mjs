// La sincronizzazione temporanea funziona davvero?
//
// Durante la migrazione il codice scrive ancora su `properties`, `ristoranti` e
// `attivita`, e dei trigger copiano tutto su `entita`. Se quella copia avesse un
// difetto, al momento del passaggio i clienti si ritroverebbero i dati com'erano
// il giorno della migration — e nessuno se ne accorgerebbe prima.
//
// Qui si prova sul serio: crea, modifica e cancella in ognuna delle tre tabelle
// e verifica che `entita` segua. Pulisce sempre ciò che ha creato.
//
// Uso: node probe-sincronizzazione.mjs

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.test' })
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } })

let problemi = 0
const esito = (ok, testo) => { console.log(`  ${ok ? '✓' : '✗'} ${testo}`); if (!ok) problemi++ }
const leggi = async id => (await admin.from('entita').select('*').eq('id', id).maybeSingle()).data

let az = null
const creati = []

try {
  const { data: a } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-SYNC-${Date.now()}` }).select().single()
  az = a.id

  const CASI = [
    { tabella: 'properties', tipo: 'struttura',  campo: 'wifi_name',  valore: 'Rete-Prova' },
    { tabella: 'ristoranti', tipo: 'ristorante', campo: 'schedule',   valore: '12:00-23:00' },
    { tabella: 'attivita',   tipo: 'attivita',   campo: 'schedule',   valore: '09:00-18:00' },
  ]

  for (const c of CASI) {
    console.log(`\n${c.tabella}`)
    const slug = `zz-sync-${c.tipo}-${Date.now()}`

    // 1. CREAZIONE
    const { data: nuovo, error } = await admin.from(c.tabella)
      .insert({ azienda_id: az, slug, name: `ZZ ${c.tipo}`, active: true }).select().single()
    if (error) { esito(false, `creazione fallita: ${error.message}`); continue }
    creati.push([c.tabella, nuovo.id])

    const copia = await leggi(nuovo.id)
    esito(!!copia, 'la creazione arriva in `entita`')
    esito(copia?.tipo === c.tipo, `tipo corretto (${copia?.tipo})`)
    esito(copia?.slug === slug, 'slug corretto')

    // 2. MODIFICA
    await admin.from(c.tabella).update({ name: 'ZZ Rinominata', [c.campo]: c.valore }).eq('id', nuovo.id)
    const dopo = await leggi(nuovo.id)
    esito(dopo?.name === 'ZZ Rinominata', 'la modifica del nome arriva')
    esito(dopo?.[c.campo] === c.valore, `la modifica di ${c.campo} arriva`)

    // 3. IL CAMPO CHE CAMBIA NOME (modules/pwa → moduli)
    const campoModuli = c.tabella === 'attivita' ? 'pwa' : 'modules'
    await admin.from(c.tabella).update({ [campoModuli]: { info: true, prova: true } }).eq('id', nuovo.id)
    const conModuli = await leggi(nuovo.id)
    esito(conModuli?.moduli?.prova === true, `${campoModuli} confluisce in moduli`)

    // 4. CANCELLAZIONE
    await admin.from(c.tabella).delete().eq('id', nuovo.id)
    creati.pop()
    const sparito = await leggi(nuovo.id)
    esito(!sparito, 'la cancellazione arriva in `entita`')
  }

  // Il settore delle attività: `tipo` libero deve finire in `settore`, non in `tipo`
  console.log('\nattività con settore descritto')
  const slug2 = `zz-sync-set-${Date.now()}`
  const { data: att } = await admin.from('attivita')
    .insert({ azienda_id: az, slug: slug2, name: 'ZZ Settore', tipo: 'Officina meccanica', active: true }).select().single()
  if (att) {
    creati.push(['attivita', att.id])
    const c2 = await leggi(att.id)
    esito(c2?.tipo === 'attivita', `il tipo tecnico resta "attivita" (è ${c2?.tipo})`)
    esito(c2?.settore === 'Officina meccanica', `la descrizione va in settore (è "${c2?.settore}")`)
  }

  console.log('\n' + '─'.repeat(60))
  console.log(problemi ? `${problemi} PROBLEMI — la sincronizzazione non è affidabile` : 'SINCRONIZZAZIONE CORRETTA')
} catch (e) {
  console.error('ERRORE:', e.message)
  problemi++
} finally {
  for (const [tab, id] of creati) await admin.from(tab).delete().eq('id', id)
  if (az) {
    await admin.from('entita').delete().eq('azienda_id', az)  // eventuali residui
    const { error } = await admin.from('aziende').delete().eq('id', az)
    if (error) console.error('pulizia azienda:', error.message)
  }
  console.log('[probe] dati di prova eliminati')
  process.exit(problemi ? 1 : 0)
}
