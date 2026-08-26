// Come sono i siti PRIMA di spostare la lettura. La fotografia di riferimento.
//
// Il passo 4 cambia da dove arrivano attività ed escursioni: dai campi jsonb
// dell'entità alla tabella `offerte`. Il passaggio deve essere **invisibile** —
// stesso metodo dell'unificazione delle entità, dove i 13 siti sono rimasti
// identici carattere per carattere.
//
// Questa sonda salva l'impronta di ogni pagina pubblica. Dopo il cambio si
// rilancia `probe-confronto-dopo.mjs` e si confrontano.
//
// Uso: node probe-confronto-prima.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { writeFileSync } from 'fs'
config({ path: '.env.test' })
const a = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
const BASE = process.env.TEST_URL || 'https://www.oltrenova.com'
const pref = { struttura:'s', ristorante:'r', attivita:'a' }

// Solo il testo visibile: gli script cambiano a ogni build e non dicono niente
// su cosa vede una persona.
const impronta = h => h.replace(/<script[\s\S]*?<\/script>/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()

const { data: ent } = await a.from('entita').select('slug, tipo, name').eq('active', true)
const foto = {}
console.log('\nFOTOGRAFIA DEI SITI, PRIMA DEL CAMBIO\n')
for (const e of ent) {
  for (const [nome, url] of [['sito', `/${pref[e.tipo]}/${e.slug}`], ['app', `/${pref[e.tipo]}/${e.slug}?qr=1`]]) {
    try {
      const r = await fetch(BASE + url, { signal: AbortSignal.timeout(30000) })
      const t = impronta(await r.text())
      foto[url] = { stato: r.status, lunghezza: t.length, testo: t }
      console.log(`  ${e.slug.padEnd(33)} ${nome.padEnd(5)} ${r.status}  ${t.length} caratteri`)
    } catch (err) { console.log(`  ⚠ ${url} — rete: ${err.message}`) }
  }
}
writeFileSync('.foto-prima.json', JSON.stringify(foto))
console.log(`\n  ${Object.keys(foto).length} pagine fotografate in .foto-prima.json`)
