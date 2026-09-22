// I testi lunghi nel formato che il rich-text della piattaforma capisce.
//
// ⛔ Li avevo scritti con i tag `<p>`: NON sono ammessi (`lib/testo-ricco.js`
// riaccende solo b/strong/i/em/u/s/br/small/sup/sub/mark) e finivano stampati
// a schermo, tag compresi, sul sito di un cliente. I paragrafi si separano con
// una RIGA VUOTA: `RichText` li trasforma in <p> da solo.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('./.env.local', 'utf8')
const v = k => (env.match(new RegExp('^\\uFEFF?' + k + '=(.*)$', 'm')) || [])[1]?.trim()
const db = createClient(v('NEXT_PUBLIC_SUPABASE_URL'), v('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })
const ENT = '84368702-c9ea-41eb-8932-28cdbfd77399'

const TESTI = {
  'Chi siamo': `Da oltre 55 anni, <strong>inlingua Terni</strong> è un punto di riferimento per la formazione linguistica sul territorio. La nostra scuola opera secondo gli standard qualitativi del network internazionale inlingua, nato in Svizzera, offrendo percorsi didattici efficaci, aggiornati e personalizzati.

Accompagniamo bambini, ragazzi, adulti e aziende in percorsi di formazione continua, adattati alle esigenze di ogni fase della vita.

L'esperienza maturata nel tempo si riflette nei risultati dei nostri studenti, che ogni anno affrontano con successo certificazioni ed esami internazionali come Cambridge, Gatehouse e Hippo.

La fiducia che abbiamo costruito è confermata anche dalle numerose aziende e istituzioni che scelgono inlingua Terni per la formazione linguistica dei propri collaboratori, tra cui <strong>Acciai Speciali Terni, Alcantara, Camera di Commercio dell'Umbria, Faurecia, Garofoli S.p.A. e Takeda Pharmaceutical Company</strong>.`,

  'Il network inlingua nel mondo': `Dal 1968, inlingua è uno dei principali network internazionali specializzati nell'insegnamento delle lingue. Presente in oltre 40 Paesi, ogni anno accompagna circa 300.000 studenti nell'apprendimento di oltre 20 lingue attraverso un metodo didattico esclusivo, orientato alla comunicazione e adattato alle diverse età, ai livelli di partenza e agli obiettivi di ciascuno.

L'appartenenza al network garantisce standard qualitativi condivisi, aggiornamento costante dei programmi e un approccio metodologico consolidato a livello internazionale.`,

  'Il metodo diretto inlingua': `Il cuore del metodo è semplice: <strong>si parla dalla prima lezione, senza traduzione</strong>. La grammatica emerge naturalmente dal dialogo, guidata da docenti che trasformano ogni errore in un progresso.

Ogni studente è seguito con un percorso personalizzato, supportato da docenti qualificati e da un metodo che mette al centro la comunicazione, la partecipazione attiva e il raggiungimento di risultati concreti.`,

  'Certificazioni internazionali': `inlingua Terni è <strong>centro di preparazione e certificazione</strong> per i principali esami linguistici internazionali, offrendo un percorso completo che accompagna ogni studente dalla preparazione al conseguimento della certificazione.`,
}

const { data: p } = await db.from('pagine').select('id, blocks').eq('entity_id', ENT).eq('slug', '__home__').single()
let toccati = 0
const blocchi = (p.blocks || []).map(b => {
  const t = TESTI[b.data?.title]
  if (!t) return b
  toccati++
  return { ...b, data: { ...b.data, text: t } }
})
console.log('blocchi riscritti:', toccati, 'su', Object.keys(TESTI).length, 'attesi')
const restati = (p.blocks || []).filter(b => typeof b.data?.text === 'string' && /<\/?p>/.test(b.data.text)).map(b => b.data.title)
if (restati.length) console.log('⚠️  ancora con <p>:', restati.join(', '))

const { error } = await db.from('pagine').update({ blocks: blocchi }).eq('id', p.id)
console.log(error ? '✗ ' + error.message : '✓ testi salvati')
