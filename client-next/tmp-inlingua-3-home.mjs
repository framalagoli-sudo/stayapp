// La home di inlingua Terni secondo il brief.
//
// Regole che mi sono dato, dal documento:
//  · i testi della fonte 1 (docx del cliente) vanno VERBATIM, non parafrasati;
//  · niente numeri, nomi o certificazioni che non siano nelle due fonti;
//  · dove le fonti si contraddicono vince la fonte 1 (55+ anni, 3 anni, elenco
//    aziende del docx);
//  · Verona è riferimento di registro, non di testi.
//
// Senza --esegui stampa soltanto il prima/dopo.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('./.env.local', 'utf8')
const v = k => (env.match(new RegExp('^\\uFEFF?' + k + '=(.*)$', 'm')) || [])[1]?.trim()
const db = createClient(v('NEXT_PUBLIC_SUPABASE_URL'), v('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })
const ENT = '84368702-c9ea-41eb-8932-28cdbfd77399'
const BASE = '/a/inlingua-terni'
const esegui = process.argv.includes('--esegui')
const id = () => crypto.randomUUID()

const { data: pagina } = await db.from('pagine').select('id, blocks').eq('entity_id', ENT).eq('slug', '__home__').single()
const vecchi = Object.fromEntries((pagina.blocks || []).map(b => [b.type + ':' + b.id, b]))
const primo = t => (pagina.blocks || []).find(b => b.type === t)
const tieni = t => { const b = primo(t); if (!b) throw new Error('blocco non trovato: ' + t); return b }

// Le foto già sul sito (Unsplash, messe dall'AI builder): si riusano dove
// hanno senso. ⚠️ Foto vere della scuola non ce ne sono — né in galleria né
// nella cartella del cliente — e le slide stesse dicono che servirebbero.
const FOTO = {
  aula:    primo('hero_slider')?.data?.slides?.[0]?.image_url || '',
  studio:  primo('hero_slider')?.data?.slides?.[1]?.image_url || '',
  lezione: vecchi['foto_testo:003a4226-1a95-4389-b40e-78ec42117944']?.data?.image_url || '',
  test:    vecchi['foto_testo:e3a9ba4d-76cd-4b8d-85ae-d5ea17df092a']?.data?.image_url || '',
  bandiere: vecchi['foto_testo:127b1083-af44-4b7a-a8b9-4b235e686563']?.data?.image_url || '',
}

const blocchi = []
const add = b => { blocchi.push(b); return b }

// ── 1. Apertura ─────────────────────────────────────────────────────────────
// H1 con la chiave locale («corsi di lingua a Terni»), payoff del brand nel
// sottotitolo. ⛔ Via «insieme a Roberta»: un nome proprio in H1 non lo cerca
// nessuno, e il brief chiede l'H1 sulla ricerca locale.
add({
  id: primo('hero_slider').id, type: 'hero_slider', style: {},
  data: {
    height: 'large',
    slides: [
      {
        id: id(), image_url: FOTO.aula,
        title: 'Corsi di lingua a Terni',
        subtitle: 'Parla. Connetti. Cresci. Da oltre 55 anni la scuola di lingue nel cuore di Terni: bambini, ragazzi, adulti e aziende.',
        cta1_text: 'Prenota il test di livello gratuito', cta1_url: `${BASE}/p/test-di-livello`,
      },
      {
        id: id(), image_url: FOTO.studio,
        title: 'Parli dalla prima lezione',
        subtitle: 'Il metodo diretto inlingua: si usa la lingua da subito, senza traduzione. La grammatica emerge dal dialogo.',
        cta1_text: 'Scopri il metodo', cta1_url: `${BASE}/p/corsi-di-lingua`,
      },
    ],
  },
})

// ── 2. Chi siamo — FONTE 1, VERBATIM ────────────────────────────────────────
add({
  id: tieni('about').id, type: 'about', style: { etichetta: '01' },
  data: {
    titolo: 'Chi siamo',
    text: `<p>Da oltre 55 anni, <strong>inlingua Terni</strong> è un punto di riferimento per la formazione linguistica sul territorio. La nostra scuola opera secondo gli standard qualitativi del network internazionale inlingua, nato in Svizzera, offrendo percorsi didattici efficaci, aggiornati e personalizzati.</p>
<p>Accompagniamo bambini, ragazzi, adulti e aziende in percorsi di formazione continua, adattati alle esigenze di ogni fase della vita.</p>
<p>L'esperienza maturata nel tempo si riflette nei risultati dei nostri studenti, che ogni anno affrontano con successo certificazioni ed esami internazionali come Cambridge, Gatehouse e Hippo.</p>
<p>La fiducia che abbiamo costruito è confermata anche dalle numerose aziende e istituzioni che scelgono inlingua Terni per la formazione linguistica dei propri collaboratori, tra cui <strong>Acciai Speciali Terni, Alcantara, Camera di Commercio dell'Umbria, Faurecia, Garofoli S.p.A. e Takeda Pharmaceutical Company</strong>.</p>`,
  },
})

// ── 3. I numeri (fonte 2, con il 55+ della fonte 1 che vince su D1) ─────────
add({
  id: id(), type: 'stats', style: {},
  data: {
    titolo: '', variant: 'plain',
    items: [
      { id: id(), value: '55+', label: 'anni a Terni' },
      { id: id(), value: '350+', label: 'sedi nel mondo' },
      { id: id(), value: '40+', label: 'Paesi' },
      { id: id(), value: '1968', label: 'nasce il metodo' },
    ],
  },
})

// ── 4. Il network inlingua — FONTE 1, VERBATIM ──────────────────────────────
add({
  id: id(), type: 'foto_testo', style: {},
  data: {
    title: 'Il network inlingua nel mondo',
    text: `<p>Dal 1968, inlingua è uno dei principali network internazionali specializzati nell'insegnamento delle lingue. Presente in oltre 40 Paesi, ogni anno accompagna circa 300.000 studenti nell'apprendimento di oltre 20 lingue attraverso un metodo didattico esclusivo, orientato alla comunicazione e adattato alle diverse età, ai livelli di partenza e agli obiettivi di ciascuno.</p>
<p>L'appartenenza al network garantisce standard qualitativi condivisi, aggiornamento costante dei programmi e un approccio metodologico consolidato a livello internazionale.</p>`,
    image_url: FOTO.bandiere, inverti: true,
  },
})

// ── 5. Per chi (fonte 2, §2.4 — con «dai 3 anni» della fonte 1 su D3) ───────
add({
  id: tieni('paragrafi').id, type: 'paragrafi', style: { etichetta: '02' },
  data: {
    titolo: 'Un corso per ogni persona',
    items: [
      { id: id(), icon: 'trending-up', title: 'Per te che vuoi crescere', text: 'Inglese per lavoro, studio o viaggio: corsi individuali, in piccoli gruppi o collettivi, per ogni livello.' },
      { id: id(), icon: 'smile', title: 'Per i più piccoli', text: 'Dai 3 anni, con programmi costruiti per ogni fascia d\'età: non adattamenti dei corsi per adulti, ma percorsi pensati per crescere giocando.' },
      { id: id(), icon: 'globe', title: 'Per chi arriva da fuori', text: 'Italiano per stranieri e oltre 8 lingue, con docenti qualificati e percorsi su misura.' },
      { id: id(), icon: 'briefcase', title: 'Per le aziende', text: 'Formazione in sede, in azienda o in aula virtuale, più traduzioni e interpretariato in tutte le lingue.' },
    ],
  },
})

// ── 6. Il metodo diretto (fonte 2, §2.2) ────────────────────────────────────
add({
  id: tieni('foto_testo').id, type: 'foto_testo', style: {},
  data: {
    title: 'Il metodo diretto inlingua',
    text: `<p>Il cuore del metodo è semplice: <strong>si parla dalla prima lezione, senza traduzione</strong>. La grammatica emerge naturalmente dal dialogo, guidata da docenti che trasformano ogni errore in un progresso.</p>
<p>Ogni studente è seguito con un percorso personalizzato, supportato da docenti qualificati e da un metodo che mette al centro la comunicazione, la partecipazione attiva e il raggiungimento di risultati concreti.</p>`,
    image_url: FOTO.lezione, inverti: false,
    button_label: 'Prenota il test di livello', button_url: `${BASE}/p/test-di-livello`,
  },
})

// ── 7. Perché ci scelgono (fonte 1 §1.4 + fonte 2 §2.3, senza doppioni) ─────
add({
  id: tieni('colonne').id, type: 'colonne', style: { etichetta: '03' },
  data: {
    titolo: 'Perché ci scelgono',
    columns: 3,
    items: [
      { id: id(), title: 'Oltre 55 anni di esperienza', text: 'Una scuola del territorio con standard internazionali: l\'esperienza si vede nei risultati degli studenti.' },
      { id: id(), title: 'Un metodo collaudato', text: 'Nato a Berna nel 1968, oggi in oltre 350 sedi e più di 40 Paesi: lo stesso standard internazionale, qui a Terni.' },
      { id: id(), title: 'Le aziende del territorio si fidano', text: 'Acciai Speciali Terni, Alcantara, Camera di Commercio dell\'Umbria, Faurecia, Garofoli S.p.A., Takeda Pharmaceutical Company.' },
      { id: id(), title: 'Percorsi personalizzati', text: 'Costruiti sull\'età, sugli obiettivi e sul livello di partenza di chi li segue.' },
      { id: id(), title: 'Docenti qualificati', text: 'Formazione orientata alla comunicazione pratica, non alla teoria astratta.' },
      { id: id(), title: 'Certificazioni che valgono', text: 'Preparazione completa agli esami internazionali, con l\'esame in sede.' },
    ],
  },
})

// ── 8. Certificazioni per lingua (fonte 1 §1.5 + fonte 2 §2.5) ──────────────
add({
  id: id(), type: 'about', style: {},
  data: {
    titolo: 'Certificazioni internazionali',
    text: `<p>inlingua Terni è <strong>centro di preparazione e certificazione</strong> per i principali esami linguistici internazionali, offrendo un percorso completo che accompagna ogni studente dalla preparazione al conseguimento della certificazione.</p>`,
  },
})
add({
  id: id(), type: 'colonne', style: {},
  data: {
    titolo: '',
    columns: 3,
    items: [
      { id: id(), title: 'Inglese', text: 'Cambridge ESOL · IELTS · Gatehouse · Hippo' },
      { id: id(), title: 'Spagnolo', text: 'DELE' },
      { id: id(), title: 'Francese', text: 'DELF' },
      { id: id(), title: 'Tedesco', text: 'Goethe-Zertifikat' },
      { id: id(), title: 'Cinese e giapponese', text: 'HSKK · JLPT' },
      { id: id(), title: 'Sempre incluso', text: 'Attestato di frequenza con ore e livello raggiunto, a prescindere dalla certificazione.' },
    ],
  },
})

// ── 9. Il test di livello (blocco esistente, testo invariato) ───────────────
add({ ...vecchi['foto_testo:e3a9ba4d-76cd-4b8d-85ae-d5ea17df092a'] })

// ── 10. Online learning (fonte 2, §2.5) ─────────────────────────────────────
add({
  id: id(), type: 'paragrafi', style: {},
  data: {
    titolo: 'Online come in classe',
    items: [
      { id: id(), icon: 'camera', title: 'Virtual Classroom', text: 'Lezioni dal vivo online, con la stessa efficacia della presenza.' },
      { id: id(), icon: 'users', title: 'my.conversations', text: 'Conversazioni in piccoli gruppi con studenti da tutto il mondo.' },
      { id: id(), icon: 'zap', title: 'my.lab', text: 'Esercizi interattivi accessibili 24 ore su 24, da ogni dispositivo.' },
    ],
  },
})

// ── 11-15. Quello che il brief dice di non toccare ──────────────────────────
add(tieni('highlights'))
add(tieni('steps'))
add(tieni('testimonianze'))
add(tieni('team'))
add(tieni('pacchetti'))
add(tieni('faq'))

// ── 16. «Iniziamo oggi» (fonte 2, §2.7) ─────────────────────────────────────
add({
  id: tieni('cta_banner').id, type: 'cta_banner', style: { bg: 'gradient' },
  data: {
    title: 'Iniziamo oggi.',
    variant: 'center',
    subtitle: 'Una promessa semplice: un test di livello gratuito, senza impegno. Da lì scegliamo insieme il percorso giusto.',
    button_text: 'Prenota il test di livello gratuito',
    button_url: `${BASE}/p/test-di-livello`,
  },
})
add(tieni('form_builder'))
// Gli eventi scendono in fondo: chi arriva da Google deve prima capire chi
// siamo, non incontrare un Open Week già passato.
add(tieni('eventi'))
add(tieni('social'))

// ── Confronto ───────────────────────────────────────────────────────────────
console.log('PRIMA:', (pagina.blocks || []).map(b => b.type).join(' → '))
console.log('\nDOPO :', blocchi.map(b => b.type).join(' → '))
console.log('\nblocchi:', (pagina.blocks || []).length, '→', blocchi.length)
const senzaFoto = ['aula', 'studio', 'lezione', 'test', 'bandiere'].filter(k => !FOTO[k])
if (senzaFoto.length) console.log('⚠️  foto non trovate:', senzaFoto.join(', '))

if (!esegui) { console.log('\n(simulazione: rilancia con --esegui)'); process.exit(0) }
const { error } = await db.from('pagine').update({
  blocks: blocchi,
  seo_title: 'inlingua Terni | Corsi di Lingua a Terni — Inglese, Certificazioni, Aziende',
  seo_description: 'Corsi di lingua a Terni per bambini, adulti e aziende: metodo diretto inlingua dal 1968, certificazioni Cambridge, IELTS e altre. Prenota il test di livello gratuito.',
}).eq('id', pagina.id)
console.log(error ? '\n✗ ' + error.message : '\n✓ home aggiornata')
