// A5 — i limiti di frequenza sono veri o aggirabili?
//
// `getClientIp` prende il PRIMO valore di `x-forwarded-for`. Se il proxy davanti
// all'app appende invece di sostituire, un client che manda il proprio header si
// sceglie l'identità a ogni richiesta e **ogni** limite della piattaforma diventa
// decorativo: chat AI (che paghiamo noi), form, iscrizioni, ordini.
//
// Si misura su /api/loyalty/public/:id/saldo — 20 richieste ogni 10 minuti,
// non scrive nulla e non costa niente.
//
// Uso: node probe-rate-limit.mjs

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.test' })
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } })
const BASE = process.env.TEST_URL || 'https://www.oltrenova.com'

let problemi = 0
const esito = (ok, testo) => { console.log(`  ${ok ? '✓' : '✗'} ${testo}`); if (!ok) problemi++ }

const LIMITE = 20   // come dichiarato nella route
let az = null

try {
  const { data: a } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-RL-${Date.now()}` }).select().single()
  az = a.id
  const url = `${BASE}/api/loyalty/public/${az}/saldo?email=probe@example.invalid`

  const colpisci = async (xff) => {
    const r = await fetch(url, { headers: xff ? { 'X-Forwarded-For': xff } : {} })
    return r.status
  }

  // ── 1. Il limite scatta davvero? ────────────────────────────────────────────
  console.log(`\n[1] esaurisco il limite (${LIMITE}/10min) fingendo un IP fisso`)
  const IP_FINTO = '203.0.113.45'      // TEST-NET-3, non instradabile
  let bloccatoDopo = null
  for (let i = 1; i <= LIMITE + 6; i++) {
    const s = await colpisci(IP_FINTO)
    if (s === 429) { bloccatoDopo = i; break }
  }
  if (bloccatoDopo) {
    console.log(`     bloccato alla richiesta n° ${bloccatoDopo}`)
    esito(true, 'il limite scatta')
  } else {
    esito(false, `dopo ${LIMITE + 6} richieste non è mai arrivato un 429 — il limite non morde`)
  }

  // ── 2. Cambiando l'IP dichiarato, il contatore riparte? ─────────────────────
  if (bloccatoDopo) {
    console.log('\n[2] cambio l’IP dichiarato nell’header e riprovo')
    const s1 = await colpisci(IP_FINTO)                    // stesso IP → atteso 429
    const s2 = await colpisci('198.51.100.77')             // altro IP → ?
    console.log(`     stesso IP dichiarato → ${s1}`)
    console.log(`     IP dichiarato diverso → ${s2}`)
    if (s1 === 429 && s2 === 429) {
      esito(true, 'il limite NON si aggira cambiando l’header: il proxy impone l’IP reale')
    } else if (s1 === 429 && s2 === 200) {
      esito(false, 'BASTA CAMBIARE L’HEADER per ripartire da zero — ogni limite è aggirabile')
    } else {
      esito(false, `esito ambiguo (${s1}/${s2}): verificare a mano`)
    }
  } else {
    console.log('\n[2] saltato: senza un blocco iniziale il confronto non dice nulla')
  }

  // ── 3. Un IP inventato a ogni colpo: quante ne passano? ─────────────────────
  console.log('\n[3] IP diverso a ogni richiesta (è così che si brucerebbe il credito AI)')
  let passate = 0
  for (let i = 0; i < 12; i++) {
    const s = await colpisci(`198.51.100.${i + 10}`)
    if (s === 200) passate++
  }
  console.log(`     ${passate}/12 richieste passate`)
  esito(passate === 0, passate === 0
    ? 'nessuna passata: il limite regge anche a IP sempre nuovi'
    : `${passate} passate su 12 — un attaccante ripete all’infinito cambiando header`)

  console.log('\n' + '─'.repeat(62))
  console.log(problemi ? `${problemi} PROBLEMI DA GUARDARE` : 'NESSUN PROBLEMA')
} catch (e) {
  console.error('ERRORE:', e.message)
  problemi++
} finally {
  if (az) {
    const { error } = await admin.from('aziende').delete().eq('id', az)
    if (error) console.error('pulizia azienda:', error.message)
    console.log('[probe] azienda di prova eliminata')
  }
  process.exit(problemi ? 1 : 0)
}
