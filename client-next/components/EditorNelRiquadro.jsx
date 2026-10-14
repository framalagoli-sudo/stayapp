'use client'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { ArrowUp, ArrowDown, Copy, Trash2, GripVertical, Plus, ImagePlus, Sparkles, X } from 'lucide-react'
import { blockLabel } from '@/lib/blockTypes'
import { campiDiTesto, campiImmagine, cosaManca, indirizzoAmmesso, LISTE } from '@/lib/editor-visuale'

// La parte dell'editor visuale che vive DENTRO la pagina, quando è incorniciata
// dal pannello: le sezioni si scelgono con un clic, si spostano, e accettano i
// blocchi trascinati dalla colonna del pannello.
//
// ⚠️ Qui non si decide niente: si dice al pannello cosa ha fatto la persona
// («ha scelto questo», «ha lasciato cadere qui») e il pannello cambia i blocchi.
// La pagina aperta da sola non arriva mai a questo codice: lo accende solo il
// messaggio del pannello, che `LandingBlockRenderer` accetta dalla finestra
// madre e dalla stessa origine.

export const TIPO_TRASCINATO = 'application/x-oltrenova-blocco'

function parla(messaggio) {
  try { window.parent.postMessage(messaggio, window.location.origin) } catch {}
}

const STILE = `
  [data-cookie-banner] { display: none !important; }
  .ev-blocco { position: relative; cursor: pointer; }
  .ev-blocco::after { content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 40; border: 0 solid #5b6af8; }
  .ev-blocco:hover::after { border: calc(2px * var(--ev-s, 1)) dashed #5b6af8; }
  .ev-blocco.ev-scelto::after { border: calc(3px * var(--ev-s, 1)) solid #5b6af8; }
  .ev-blocco::before { content: attr(data-nome); position: absolute; top: 0; left: 0; z-index: 46; display: none; pointer-events: none; padding: 4px 10px;
    background: #5b6af8; color: #fff; font: 600 12px/1.3 system-ui, sans-serif; border-radius: 0 0 8px 0; transform: scale(var(--ev-s, 1)); transform-origin: top left; }
  .ev-blocco:hover::before, .ev-blocco.ev-scelto::before { display: block; }
  .lbr-anim .ev-blocco .lbr-reveal { opacity: 1 !important; transform: none !important; transition: none !important; }
  /* Le parole che scorrono stanno ferme: su un testo che si muove non si scrive. */
  .ev-blocco .lbr-scorre { animation: none !important; }
  .ev-blocco [data-campo] { cursor: text; outline: calc(1px * var(--ev-s, 1)) dashed transparent; outline-offset: calc(3px * var(--ev-s, 1)); border-radius: 3px; }
  .ev-blocco [data-campo]:hover { outline-color: #5b6af8; }
  .ev-blocco [data-campo]:focus { outline: calc(2px * var(--ev-s, 1)) solid #5b6af8; background: rgba(91,106,248,0.08); }
  .ev-vuoto { padding: 36px 24px; text-align: center; font: 600 15px/1.5 system-ui, sans-serif; color: #5b6af8; background: #f3f4ff; border: 2px dashed #c3c9fb; }
  .ev-inizio { margin: 48px 24px; padding: 72px 24px; text-align: center; font: 600 17px/1.5 system-ui, sans-serif; color: #5b6af8; background: #f3f4ff; border: 2px dashed #c3c9fb; border-radius: 14px; }
  .ev-binario { position: absolute; inset: 0; pointer-events: none; z-index: 45; display: flex; justify-content: flex-end; align-items: flex-start; }
  .ev-barra { position: sticky; top: 76px; margin: 10px; pointer-events: auto; display: flex; gap: 2px; padding: 4px;
    background: #1a1a2e; border-radius: 9px; box-shadow: 0 6px 20px rgba(0,0,0,0.3); transform: scale(var(--ev-s, 1)); transform-origin: top right; }
  .ev-barra button, .ev-barra span { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: 0; border-radius: 6px; background: none; color: #fff; cursor: pointer; padding: 0; }
  .ev-barra button:hover, .ev-barra span:hover { background: rgba(255,255,255,0.16); }
  .ev-barra button:disabled { opacity: 0.3; cursor: default; background: none; }
  .ev-barra span { cursor: grab; }
  .ev-piu { position: absolute; top: 0; left: 50%; z-index: 47; display: none; align-items: center; justify-content: center; width: 30px; height: 30px; padding: 0; border: 0; border-radius: 50%;
    background: #5b6af8; color: #fff; cursor: pointer; box-shadow: 0 3px 12px rgba(0,0,0,0.3); transform: translate(-50%, -50%) scale(var(--ev-s, 1)); }
  .ev-piu.ev-piu-primo { transform: translate(-50%, 6px) scale(var(--ev-s, 1)); transform-origin: top center; }
  .ev-piu.ev-piu-sotto { top: auto; bottom: 0; transform: translate(-50%, -6px) scale(var(--ev-s, 1)); transform-origin: bottom center; }
  .ev-blocco:hover > .ev-piu { display: flex; }
  .ev-trascina .ev-piu, .ev-trascina .ev-attrezzi { display: none !important; }
  .ev-blocco img[data-foto] { cursor: pointer; }
  .ev-attrezzi { position: absolute; z-index: 2147482000; display: none; gap: 2px; padding: 3px; background: #5b6af8; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    transform: translate(-100%, -100%) scale(var(--ev-s, 1)); transform-origin: bottom right; }
  .ev-attrezzi.ev-dentro { transform: translate(-100%, 0) scale(var(--ev-s, 1)); transform-origin: top right; }
  .ev-attrezzi.ev-foto { transform: translate(0, -100%) scale(var(--ev-s, 1)); transform-origin: bottom left; background: #1a1a2e; }
  .ev-attrezzi button, .ev-menu button { display: flex; align-items: center; gap: 7px; border: 0; background: none; color: #fff; cursor: pointer; font: 600 12.5px/1 system-ui, sans-serif; }
  .ev-attrezzi button { justify-content: center; min-width: 28px; height: 28px; padding: 0 6px; border-radius: 5px; }
  .ev-attrezzi button:hover { background: rgba(255,255,255,0.22); }
  .ev-attrezzi button:disabled { opacity: 0.35; cursor: default; background: none; }
  .ev-menu { position: fixed; z-index: 2147483100; display: none; flex-direction: column; min-width: 210px; padding: 5px; background: #1a1a2e; border-radius: 10px; box-shadow: 0 10px 34px rgba(0,0,0,0.4);
    transform: scale(var(--ev-s, 1)); transform-origin: top left; }
  .ev-menu button { justify-content: space-between; width: 100%; padding: 9px 11px; border-radius: 6px; font-weight: 500; font-size: 13px; text-align: left; }
  .ev-menu button:hover { background: rgba(255,255,255,0.14); }
  .ev-menu button:disabled { opacity: 0.35; cursor: default; background: none; }
  .ev-menu button small { opacity: 0.55; font-size: 11px; }
  .ev-menu hr { width: 100%; border: 0; border-top: 1px solid rgba(255,255,255,0.14); margin: 4px 0; }
  .ev-aggiungi-foto { position: absolute; left: 12px; bottom: 12px; z-index: 46; display: none; gap: 6px; flex-wrap: wrap; transform: scale(var(--ev-s, 1)); transform-origin: bottom left; }
  .ev-blocco:hover > .ev-aggiungi-foto, .ev-blocco.ev-scelto > .ev-aggiungi-foto, .ev-blocco.ev-senza > .ev-aggiungi-foto { display: flex; }
  .ev-aggiungi-foto button { display: flex; align-items: center; gap: 7px; padding: 8px 12px; border: 0; border-radius: 8px; background: #1a1a2e; color: #fff; cursor: pointer; font: 600 12.5px/1 system-ui, sans-serif; box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
  .ev-aggiungi-foto button:hover { background: #5b6af8; }
  .ev-trascina .ev-aggiungi-foto, .ev-trascina .ev-formato { display: none !important; }
  .ev-formato { position: absolute; z-index: 2147482500; display: none; align-items: center; gap: 2px; padding: 4px; background: #1a1a2e; border-radius: 9px; box-shadow: 0 6px 22px rgba(0,0,0,0.35);
    transform: translate(0, -100%) scale(var(--ev-s, 1)); transform-origin: bottom left; font: 500 12px/1 system-ui, sans-serif; color: #fff; white-space: nowrap; }
  .ev-formato.ev-sotto { transform: scale(var(--ev-s, 1)); transform-origin: top left; }
  .ev-formato button { display: flex; align-items: center; justify-content: center; min-width: 30px; height: 30px; padding: 0 8px; border: 0; border-radius: 6px; background: none; color: #fff; cursor: pointer; font: 600 14px/1 Georgia, serif; }
  .ev-formato button:hover { background: rgba(255,255,255,0.16); }
  .ev-formato button[data-f="ok"], .ev-formato button[data-f="via"] { font: 600 12px/1 system-ui, sans-serif; }
  .ev-formato .ev-nota { padding: 0 8px; opacity: 0.6; }
  .ev-formato input { width: 230px; height: 30px; padding: 0 9px; border: 0; border-radius: 6px; font: 13px/1 system-ui, sans-serif; outline: none; }
  nav.snav:hover, footer:hover { outline: calc(2px * var(--ev-s, 1)) dashed #5b6af8; outline-offset: calc(-2px * var(--ev-s, 1)); cursor: pointer; }
  .ev-qui { position: relative; margin: 0; padding: 1.9em 3.2em 1.7em; text-align: center; cursor: default; background: #f3f4ff; border: calc(2px * var(--ev-s, 1)) dashed #5b6af8; color: #3c3f5c;
    font: 500 calc(15px * var(--ev-s, 1))/1.5 system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; gap: 0.55em; }
  .ev-qui.ev-inizio { margin: 48px 24px; padding: 4em 3.2em; border-radius: 14px; }
  .ev-qui-titolo { font-weight: 700; font-size: 1.15em; color: #5b6af8; }
  .ev-qui-sotto { font-size: 0.87em; color: #6b6b76; max-width: 46em; }
  .ev-qui button { font: inherit; cursor: pointer; border: 0; }
  .ev-qui-ai { display: inline-flex; align-items: center; gap: 0.5em; padding: 0.6em 1.25em; border-radius: 2em; background: #5b6af8; color: #fff; font-weight: 700 !important; }
  .ev-qui-ai:hover { background: #4a58e0; }
  .ev-qui-ai:disabled { background: #b9bff5; cursor: default; }
  .ev-qui-ai svg { width: 1.1em; height: 1.1em; }
  .ev-qui-indietro { background: none; color: #5b6af8; font-weight: 600 !important; padding: 0.6em 0.8em; }
  .ev-qui-chiudi { position: absolute; top: 0.5em; right: 0.6em; display: flex; padding: 0.3em; background: none; color: #8a8fb5; border-radius: 0.4em; }
  .ev-qui-chiudi:hover { background: #e3e5fb; color: #3c3f5c; }
  .ev-qui-chiudi svg { width: 1.2em; height: 1.2em; }
  .ev-qui textarea { width: 100%; max-width: 44em; min-height: 5.2em; padding: 0.7em 0.9em; border: calc(1.5px * var(--ev-s, 1)) solid #c3c9fb; border-radius: 0.7em; background: #fff; color: #1a1a2e; font: inherit; resize: vertical; outline: none; box-sizing: border-box; text-align: left; }
  .ev-qui textarea:focus { border-color: #5b6af8; }
  .ev-qui-riga { display: flex; align-items: center; gap: 0.4em; flex-wrap: wrap; justify-content: center; }
  .ev-qui-errore { max-width: 44em; padding: 0.55em 0.9em; border-radius: 0.6em; background: #fdecec; color: #a11919; font-size: 0.92em; }
  .ev-trascina .ev-qui { background: #e6e8ff; }
  /* Da telefono: un tocco sceglie la sezione e basta. Niente comandi al passaggio
     (col dito il passaggio resta appiccicato), i «+» solo sopra e sotto quella scelta, grandi da toccare. */
  .ev-telefono .ev-blocco:not(.ev-scelto):hover::after { border: 0; }
  .ev-telefono .ev-blocco:not(.ev-scelto):hover::before { display: none; }
  .ev-telefono .ev-blocco > .ev-piu, .ev-telefono .ev-aggiungi-foto { display: none !important; }
  .ev-telefono .ev-blocco.ev-scelto > .ev-piu { display: flex !important; width: 40px; height: 40px; }
  .ev-telefono .ev-blocco.ev-scelto > .ev-piu-sotto { top: auto; bottom: 0; transform: translate(-50%, 50%); }
  .ev-telefono .ev-blocco.ev-scelto > .ev-piu.ev-piu-primo { transform: translate(-50%, 8px); }
  .ev-telefono .ev-blocco.ev-scelto > .ev-piu.ev-piu-ultimo { transform: translate(-50%, -8px); }
  .ev-linea { position: fixed; left: 0; right: 0; height: calc(5px * var(--ev-s, 1)); margin-top: calc(-2.5px * var(--ev-s, 1)); background: #5b6af8; box-shadow: 0 0 14px rgba(91,106,248,0.7); z-index: 2147483000; pointer-events: none; display: none; }
`

// ── Scrivere direttamente sulla pagina ───────────────────────────────────────
// Un testo della pagina che corrisponde a un campo del suo blocco diventa
// scrivibile sul posto. Non si tocca il disegnatore dei siti: dopo ogni
// disegno si guarda la pagina e si riconoscono i testi dal loro contenuto.
// Dove il riconoscimento è incerto (lo stesso testo in due campi che la pagina
// mostra un numero diverso di volte) non si offre niente: resta la scheda.
const NON_TESTI = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'LABEL', 'IFRAME', 'SCRIPT', 'STYLE'])

function testoDi(el) { return (el.textContent || '').replace(/\u00a0/g, ' ') }
function campoDi(el) {
  const sez = el?.closest?.('[data-blocco]'); if (!sez) return null
  try { return { id: sez.getAttribute('data-blocco'), percorso: JSON.parse(el.getAttribute('data-campo')) } } catch { return null }
}
function inScrittura() {
  const el = document.activeElement
  return el && el.hasAttribute?.('data-campo') ? el : null
}

// Un paragrafo di un testo formattato si riconosce allo stesso modo, ma è un
// elemento che può contenere grassetti, corsivi, link e a-capo: lì si scrive
// con la formattazione (`data-ricco`).
const PARAGRAFI = new Set(['P', 'H2', 'H3'])
const IN_LINEA = new Set(['STRONG', 'B', 'EM', 'I', 'A', 'BR', 'SPAN'])
function soloInLinea(el) { for (const x of el.querySelectorAll('*')) if (!IN_LINEA.has(x.tagName)) return false; return true }

function segnaTesti(blocks) {
  const attivo = ricco?.el || inScrittura()
  const buoni = new Set()
  if (ricco) buoni.add(ricco.el)
  for (const sez of document.querySelectorAll('[data-blocco]')) {
    const b = blocks.find(x => x?.id === sez.getAttribute('data-blocco')); if (!b) continue
    const semplici = new Map(), ricchi = new Map()
    for (const c of campiDiTesto(b.data)) {
      const dove = c.ricco ? ricchi : semplici, t = c.valore.trim()
      if (!dove.has(t)) dove.set(t, []); dove.get(t).push(c.percorso)
    }
    if (!semplici.size && !ricchi.size) continue
    const elSemplici = new Map(), elRicchi = new Map()
    for (const el of sez.querySelectorAll('*')) {
      if (!(el instanceof HTMLElement) || NON_TESTI.has(el.tagName)) continue
      if (el.closest('.ev-binario, .ev-vuoto, .ev-piu, .ev-aggiungi-foto, form')) continue
      const t = testoDi(el).trim(); if (!t) continue
      // Lo stesso testo in un campo semplice e in un paragrafo: non si sa quale sia, non si offre.
      if (semplici.has(t) && ricchi.has(t)) continue
      const dove = ricchi.has(t) && PARAGRAFI.has(el.tagName) && soloInLinea(el) ? elRicchi : semplici.has(t) && !el.childElementCount ? elSemplici : null
      if (!dove) continue
      if (!dove.has(t)) dove.set(t, []); dove.get(t).push(el)
    }
    const assegna = (trovati, campi, formattato) => {
      for (const [t, elementi] of trovati) {
        const percorsi = campi.get(t)
        if (percorsi.length > 1 && percorsi.length !== elementi.length) continue
        elementi.forEach((el, i) => {
          // Dentro un paragrafo formattato non c'è un altro testo scrivibile: è tutto suo.
          if (!formattato && el.parentElement?.closest('[data-ricco]')) return
          buoni.add(el)
          if (el === attivo) return
          el.setAttribute('data-campo', JSON.stringify(percorsi.length > 1 ? percorsi[i] : percorsi[0]))
          if (formattato) { el.setAttribute('data-ricco', '1'); el.setAttribute('contenteditable', 'true') }
          else {
            el.removeAttribute('data-ricco')
            el.setAttribute('contenteditable', 'plaintext-only')
            if (el.contentEditable !== 'plaintext-only') el.setAttribute('contenteditable', 'true')
          }
          el.setAttribute('spellcheck', 'false')
        })
      }
    }
    assegna(elRicchi, ricchi, true)
    assegna(elSemplici, semplici, false)
  }
  for (const el of document.querySelectorAll('[data-campo]')) {
    if (el === attivo || buoni.has(el)) continue
    el.removeAttribute('data-campo'); el.removeAttribute('data-ricco'); el.removeAttribute('contenteditable'); el.removeAttribute('spellcheck')
  }
}

// ── Scrivere in un paragrafo formattato ──────────────────────────────────────
// Lì dentro il browser cambia la struttura (aggiunge un grassetto, spezza un
// testo), e React non perdona che gli si tocchino i suoi nodi. Quindi mentre
// si scrive i nodi di React vengono messi da parte e al loro posto ci sono
// delle copie; alla pagina si continua a disegnare il paragrafo com'era
// (`contenuto`), così React non ha niente da cambiare. Uscendo si rimettono
// i nodi veri e si ridisegna col contenuto nuovo.
let ricco = null          // { el, originali, campo, contenuto, toccato, mandato }
let blocchiVeri = []      // gli ultimi blocchi arrivati dal pannello, senza ritocchi
let appenaScritto = null  // il paragrafo da cui si è appena usciti, finché il pannello non lo conferma

function nodoA(blocks, campo) {
  let nodo = blocks.find(b => b?.id === campo.id)?.data
  for (const k of campo.percorso) nodo = nodo?.[k]
  return nodo && typeof nodo === 'object' && Array.isArray(nodo.content) ? nodo : null
}
function conContenuto(blocks, campo, contenuto) {
  if (!nodoA(blocks, campo)) return blocks
  return blocks.map(b => {
    if (b?.id !== campo.id) return b
    const dati = JSON.parse(JSON.stringify(b.data))
    let nodo = dati
    for (const k of campo.percorso) nodo = nodo[k]
    nodo.content = contenuto
    return { ...b, data: dati }
  })
}
function preparaRicco(el) {
  if (ricco?.el === el) return true
  if (ricco) return false
  const campo = campoDi(el); const nodo = campo && nodoA(blocchiOra, campo)
  if (!nodo) return false
  const dove = cursoreIn(el)
  const originali = [...el.childNodes]
  el.replaceChildren(...originali.map(n => n.cloneNode(true)))
  ricco = { el, originali, campo, contenuto: JSON.parse(JSON.stringify(nodo.content)), toccato: false, mandato: null }
  if (dove) mettiCursore(el, dove)
  return true
}
// Quello che c'è scritto nel paragrafo, nella forma dei dati: pezzi di testo
// coi loro segni, e a-capo. Il pannello lo ricontrolla comunque da zero.
function contenutoDi(el) {
  const pezzi = []
  const visita = (nodo, segni) => {
    if (nodo.nodeType === 3) {
      const text = nodo.data.replace(/\u00a0/g, ' ').replace(/[\n\r\t]+/g, ' ')
      if (!text) return
      const marks = ['bold', 'italic'].filter(s => segni[s]).map(type => ({ type }))
      if (segni.link) marks.push({ type: 'link', attrs: { href: segni.link } })
      const ultimo = pezzi[pezzi.length - 1]
      if (ultimo?.type === 'text' && JSON.stringify(ultimo.marks || []) === JSON.stringify(marks)) ultimo.text += text
      else pezzi.push(marks.length ? { type: 'text', text, marks } : { type: 'text', text })
      return
    }
    if (nodo.nodeType !== 1) return
    if (nodo.tagName === 'BR') { pezzi.push({ type: 'hardBreak' }); return }
    const s = { ...segni }, stile = nodo.style
    if (nodo.tagName === 'B' || nodo.tagName === 'STRONG' || stile?.fontWeight === 'bold' || Number(stile?.fontWeight) >= 600) s.bold = true
    if (nodo.tagName === 'I' || nodo.tagName === 'EM' || stile?.fontStyle === 'italic') s.italic = true
    if (nodo.tagName === 'A' && nodo.getAttribute('href')) s.link = nodo.getAttribute('href')
    for (const f of nodo.childNodes) visita(f, s)
  }
  for (const f of el.childNodes) visita(f, {})
  // L'a-capo in fondo è quello che il browser tiene per mostrare la riga: non è contenuto.
  while (pezzi.length && pezzi[pezzi.length - 1].type === 'hardBreak') pezzi.pop()
  return pezzi
}
function mandaRicco() {
  const r = ricco; if (!r || !r.toccato) return null
  const contenuto = contenutoDi(r.el)
  if (!contenuto.some(p => p.type === 'text' && p.text.trim())) return null
  const chiave = JSON.stringify(contenuto)
  if (chiave !== r.mandato && chiave !== JSON.stringify(r.contenuto)) {
    r.mandato = chiave
    parla({ tipo: 'oltrenova:paragrafo-scritto', id: r.campo.id, percorso: r.campo.percorso, contenuto })
  }
  return contenuto
}
function chiudiRicco(ridisegna) {
  const r = ricco; if (!r) return
  const contenuto = mandaRicco()
  r.el.replaceChildren(...r.originali)
  ricco = null
  // Il paragrafo era disegnato com'era prima di scriverci: ora si disegna com'è.
  // Dal pannello stanno ancora tornando le versioni di un attimo fa: finché
  // non arriva quella uguale a questa, vale questa (`appenaScritto`).
  appenaScritto = contenuto ? { campo: r.campo, contenuto, chiave: JSON.stringify(contenuto), fino: Date.now() + 1500 } : null
  const veri = contenuto ? conContenuto(blocchiVeri, r.campo, contenuto) : blocchiVeri
  try { flushSync(() => ridisegna(veri)) } catch { ridisegna(veri) }
}

// Le foto della pagina che corrispondono a un campo del blocco: si riconoscono
// dall'indirizzo, come i testi dal contenuto. Stessa prudenza: se lo stesso
// indirizzo sta in due campi e la pagina lo mostra un numero diverso di volte,
// non si offre niente.
function segnaImmagini(blocks) {
  const buone = new Set()
  for (const sez of document.querySelectorAll('[data-blocco]')) {
    const b = blocks.find(x => x?.id === sez.getAttribute('data-blocco')); if (!b) continue
    const perIndirizzo = new Map()
    for (const c of campiImmagine(b.data)) { if (!perIndirizzo.has(c.valore)) perIndirizzo.set(c.valore, []); perIndirizzo.get(c.valore).push(c.percorso) }
    if (!perIndirizzo.size) continue
    const perFoto = new Map()
    for (const img of sez.querySelectorAll('img')) {
      const s = img.getAttribute('src'); if (!s || !perIndirizzo.has(s)) continue
      if (!perFoto.has(s)) perFoto.set(s, []); perFoto.get(s).push(img)
    }
    for (const [s, foto] of perFoto) {
      const percorsi = perIndirizzo.get(s)
      if (percorsi.length > 1 && percorsi.length !== foto.length) continue
      foto.forEach((img, i) => { buone.add(img); img.setAttribute('data-foto', JSON.stringify(percorsi.length > 1 ? percorsi[i] : percorsi[0])) })
    }
  }
  for (const img of document.querySelectorAll('[data-foto]')) if (!buone.has(img)) img.removeAttribute('data-foto')
}

// ── Gli elementi di una lista, sulla pagina ──────────────────────────────────
// Una scheda, una domanda, una persona: è il riquadro più grande che contiene
// i testi e le foto di UN elemento della lista e di nessun altro. Si ricava
// dai segni messi qui sopra, senza chiedere niente al disegnatore dei siti.
function percorsoDi(el) { try { return JSON.parse(el.getAttribute('data-campo') || el.getAttribute('data-foto')) } catch { return null } }
function chiaveElemento(p) { return Array.isArray(p) && LISTE.includes(p[0]) && Number.isInteger(p[1]) ? p[0] + ':' + p[1] : null }
function elementiDi(sez) {
  const segnati = [...sez.querySelectorAll('[data-campo], [data-foto]')].map(el => ({ el, k: chiaveElemento(percorsoDi(el)) }))
  const trovati = []
  for (const { el, k } of segnati) {
    if (!k || trovati.some(t => t.k === k)) continue
    let box = el, inCima = false
    while (box.parentElement) {
      const su = box.parentElement
      if (su === sez) { inCima = true; break }
      if (segnati.some(s => s.k !== k && su.contains(s.el))) break
      box = su
    }
    // Un elemento solo, senza nient'altro intorno: non si sa dove finisce.
    if (inCima) box = el.parentElement && el.parentElement !== sez ? el.parentElement : el
    const [lista, indice] = k.split(':')
    trovati.push({ k, box, lista, indice: Number(indice) })
  }
  return trovati
}

const DISEGNO = d => `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`
const ICONE = {
  freccia: DISEGNO('<path d="M12 19V5M5 12l7-7 7 7"/>'),
  copia:   DISEGNO('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  cestino: DISEGNO('<path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>'),
  foto:    DISEGNO('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>'),
  link:    DISEGNO('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'),
}
// Dove il pannello tiene il blocco copiato: stessa origine, quindi la pagina
// sa se c'è qualcosa da incollare (non cosa).
const APPUNTI = 'lbr_block_clip'

// I blocchi come sono a schermo adesso, per chi lavora fuori da React.
let blocchiOra = []

// Dove sta il cursore dentro un elemento, contato in caratteri.
function cursoreIn(el) {
  const s = window.getSelection()
  if (!s || !s.rangeCount || !el.contains(s.anchorNode) || !el.contains(s.focusNode)) return null
  const fino = (nodo, scarto) => { const r = document.createRange(); r.selectNodeContents(el); r.setEnd(nodo, scarto); return r.toString().length }
  return { da: fino(s.anchorNode, s.anchorOffset), a: fino(s.focusNode, s.focusOffset) }
}
function mettiCursore(el, { da, a }) {
  const punto = n => {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let nodo, resto = n
    while ((nodo = w.nextNode())) { if (resto <= nodo.data.length) return [nodo, resto]; resto -= nodo.data.length }
    return [el, el.childNodes.length]
  }
  const s = window.getSelection(); if (!s) return
  const [n1, o1] = punto(da), [n2, o2] = punto(a)
  try { s.setBaseAndExtent(n1, o1, n2, o2) } catch {}
}

// I blocchi che arrivano dal pannello mentre si sta scrivendo sulla pagina.
// Il testo fa un giro (pagina → pannello → pagina) e torna la versione di un
// istante prima: nel campo in cui si scrive vale quello che c'è sulla pagina,
// e il cursore si rimette dov'era dopo il disegno.
let cursoreDaRimettere = null
export function conLaScritturaInCorso(blocks) {
  blocchiVeri = blocks
  if (ricco) { cursoreDaRimettere = null; return conContenuto(blocks, ricco.campo, ricco.contenuto) }
  if (appenaScritto) {
    const a = appenaScritto
    const arrivato = JSON.stringify(nodoA(blocks, a.campo)?.content) === a.chiave
    if (arrivato || Date.now() > a.fino) appenaScritto = null
    else blocks = conContenuto(blocks, a.campo, a.contenuto)
  }
  const el = inScrittura(); const campo = el && campoDi(el)
  cursoreDaRimettere = el ? { el, dove: cursoreIn(el) } : null
  if (!campo) return blocks
  // Un campo svuotato non si disegna finché non si esce: la pagina toglierebbe
  // l'elemento su cui si sta scrivendo. Si ridisegna quello di prima, cioè niente cambia.
  const testo = testoDi(el).trim() ? testoDi(el) : (el.getAttribute('data-disegnato') ?? '')
  el.setAttribute('data-disegnato', testo)
  return blocks.map(b => b?.id === campo.id ? { ...b, data: metti(b.data, campo.percorso, testo) } : b)
}
function metti(dati, percorso, valore) {
  try {
    const copia = JSON.parse(JSON.stringify(dati || {}))
    let qui = copia
    for (let i = 0; i < percorso.length - 1; i++) qui = qui[percorso[i]]
    if (typeof qui?.[percorso[percorso.length - 1]] !== 'string') return dati
    qui[percorso[percorso.length - 1]] = valore
    return copia
  } catch { return dati }
}

// Accende i comportamenti dell'editor sulla pagina. `editor` = null fuori dal
// pannello: in quel caso non succede niente.
let ridisegnaOra = () => {}
let scalaOra = 1
export function useEditorNelRiquadro(editor, blocks, ridisegna) {
  const attivo = !!editor
  // Da telefono la pagina serve solo a scegliere una sezione: si modifica
  // dalla scheda che sale dal basso nel pannello. Col dito, scrivere sulla
  // pagina, trascinare e scorrere si confonderebbero.
  const telefono = editor?.telefono === true
  if (ridisegna) ridisegnaOra = ridisegna

  // Dopo ogni disegno: si riconoscono i testi scrivibili e, se si stava
  // scrivendo, il cursore torna dov'era.
  useLayoutEffect(() => {
    if (!attivo || telefono) return
    blocchiOra = Array.isArray(blocks) ? blocks : []
    segnaTesti(blocchiOra)
    segnaImmagini(blocchiOra)
    const c = cursoreDaRimettere; cursoreDaRimettere = null
    if (!c?.dove || document.activeElement !== c.el) return
    const ora = cursoreIn(c.el)
    if (!ora || ora.da !== c.dove.da || ora.a !== c.dove.a) mettiCursore(c.el, c.dove)
  })
  // La scala cambia quando la finestra del pannello cambia larghezza: chi lavora
  // sulla pagina la legge al momento, senza smontare niente (smontare toglierebbe
  // il cursore da sotto le dita a chi sta scrivendo).
  const scala = editor?.scala || 1
  scalaOra = scala
  const scelto = editor?.selezionato || null

  useEffect(() => {
    if (!attivo) return
    document.documentElement.style.setProperty('--ev-s', String(1 / scala))
  }, [attivo, scala])

  useEffect(() => {
    if (!attivo) return
    const stile = document.createElement('style')
    stile.textContent = STILE
    document.head.appendChild(stile)
    const linea = document.createElement('div')
    linea.className = 'ev-linea'
    document.body.appendChild(linea)

    // Nell'editor un clic sceglie, non naviga: né i link del sito né i moduli.
    const clic = e => {
      if (!telefono) chiudiMenu()
      if (e.target.closest?.('.ev-barra, .ev-piu, .ev-attrezzi, .ev-menu, .ev-formato, .ev-aggiungi-foto, .ev-qui')) return
      e.preventDefault(); e.stopPropagation()
      const b = e.target.closest?.('[data-blocco]')
      parla({ tipo: 'oltrenova:blocco-scelto', id: b ? b.getAttribute('data-blocco') : null })
      // Intestazione e piede sono del sito intero, non di questa pagina: il pannello dice dove si cambiano.
      const fuori = b ? null : e.target.closest?.('nav.snav') ? 'intestazione' : e.target.closest?.('footer') ? 'piede' : null
      if (fuori) parla({ tipo: 'oltrenova:fuori-pagina', cosa: fuori })
    }
    const invio = e => { e.preventDefault(); e.stopPropagation() }

    if (telefono) {
      document.documentElement.classList.add('ev-telefono')
      document.addEventListener('click', clic, true)
      document.addEventListener('submit', invio, true)
      return () => {
        document.removeEventListener('click', clic, true)
        document.removeEventListener('submit', invio, true)
        document.documentElement.classList.remove('ev-telefono')
        stile.remove(); linea.remove()
      }
    }

    // Scrivere su un testo della pagina: ogni battuta va al pannello, che
    // cambia il blocco. Un testo svuotato si manda solo uscendo dal campo.
    const manda = (el, anchePerVuoto) => {
      if (el.hasAttribute('data-ricco')) { if (ricco?.el === el) { ricco.toccato = true; mandaRicco() } return }
      const campo = campoDi(el); if (!campo) return
      // L'a-capo in fondo è quello che il browser tiene per mostrare la riga vuota.
      const valore = testoDi(el).replace(/\n+$/, '')
      if (!valore.trim() && !anchePerVuoto) return
      if (el.getAttribute('data-mandato') === valore) return
      el.setAttribute('data-mandato', valore)
      parla({ tipo: 'oltrenova:campo-scritto', id: campo.id, percorso: campo.percorso, valore })
    }
    const entra = e => {
      const el = e.target?.closest?.('[data-campo]'); if (!el) return
      if (el.hasAttribute('data-ricco')) { mostraFormato(el); return }
      el.setAttribute('data-disegnato', testoDi(el)); el.setAttribute('data-mandato', testoDi(el))
    }
    // In un paragrafo formattato i nodi di React si mettono da parte appena il
    // cursore si è posato, e comunque prima che il browser cambi qualcosa.
    const cursoreMosso = () => { const el = inScrittura(); if (el?.hasAttribute('data-ricco') && !ricco) preparaRicco(el) }
    const primaDiScrivere = e => { const el = e.target?.closest?.('[data-ricco]'); if (el && !preparaRicco(el)) e.preventDefault() }
    const scrive = e => { const el = e.target?.closest?.('[data-campo]'); if (el) manda(el, false) }
    const esce = e => {
      const el = e.target?.closest?.('[data-campo]'); if (!el) return
      if (el.hasAttribute('data-ricco')) {
        // Si è passati alla barra della formattazione (il campo del link): si sta ancora scrivendo.
        if (e.relatedTarget && formato.contains(e.relatedTarget)) return
        nascondiFormato(); chiudiRicco(ridisegnaOra)
        return
      }
      manda(el, true)
      el.removeAttribute('data-disegnato'); el.removeAttribute('data-mandato')
    }
    const tasto = e => {
      const el = e.target?.closest?.('[data-campo]')
      const ctrl = e.ctrlKey || e.metaKey, k = (e.key || '').toLowerCase()
      // Ctrl+S salva da ovunque, anche mentre si scrive.
      if (ctrl && k === 's') { e.preventDefault(); e.stopPropagation(); if (el) manda(el, true); parla({ tipo: 'oltrenova:tasto', quale: 'salva' }); return }
      if (el) {
        e.stopPropagation()
        if (el.hasAttribute('data-ricco')) {
          // In un paragrafo Invio va a capo; grassetto e corsivo sono Ctrl+B e Ctrl+I.
          if (e.key === 'Escape') { e.preventDefault(); el.blur() }
          else if (e.key === 'Enter') { e.preventDefault(); if (preparaRicco(el)) document.execCommand('insertLineBreak') }
          else if (ctrl && k === 'u') e.preventDefault()
          return
        }
        // Un titolo è una riga: Invio chiude. Dove il testo va a capo anche
        // sul sito, Invio va a capo. ⚠️ Si guarda lo stile SCRITTO sull'elemento:
        // quello calcolato dice «pre» per ogni testo che si sta scrivendo.
        if (e.key === 'Enter' && !e.shiftKey && /^pre/.test(el.style.whiteSpace)) { e.preventDefault(); document.execCommand('insertLineBreak'); return }
        if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); el.blur() }
        else if (e.key === ' ' && el.tagName === 'BUTTON') { e.preventDefault(); document.execCommand('insertText', false, ' ') }
        return
      }
      // Fuori dai testi, i tasti sono comandi per il pannello: lì si decide.
      if (e.target?.closest?.('input, textarea, select')) return
      let quale = null
      if (ctrl && k === 'z') quale = e.shiftKey ? 'ripeti' : 'annulla'
      else if (ctrl && k === 'y') quale = 'ripeti'
      else if (ctrl && k === 'd') quale = 'duplica'
      else if (ctrl && k === 'c' && !String(window.getSelection() || '')) quale = 'copia'
      else if (ctrl && k === 'v') quale = 'incolla'
      else if (!ctrl && k === 'delete') quale = 'elimina'
      else if (k === 'escape') { chiudiMenu(); quale = 'deseleziona' }
      if (quale) { e.preventDefault(); parla({ tipo: 'oltrenova:tasto', quale }) }
    }

    // ── Gli attrezzi che compaiono passando su un elemento di lista o su una foto ──
    const attrezzi = document.createElement('div')
    attrezzi.className = 'ev-attrezzi'
    document.body.appendChild(attrezzi)
    let mostrato = null, tNascondi = null, ultimoMovimento = null, inAttesa = false
    const nascondi = () => { clearTimeout(tNascondi); attrezzi.style.display = 'none'; mostrato = null }
    const nascondiTraPoco = () => { clearTimeout(tNascondi); tNascondi = setTimeout(nascondi, 260) }
    const guarda = () => {
      inAttesa = false
      const e = ultimoMovimento; if (!e || e.buttons) return
      if (attrezzi.contains(e.target)) { clearTimeout(tNascondi); return }
      const sez = e.target?.closest?.('[data-blocco]')
      if (!sez || e.target.closest('.ev-barra, .ev-piu, .ev-menu')) { nascondiTraPoco(); return }
      const elem = elementiDi(sez).find(x => x.box.contains(e.target)) || null
      const foto = document.elementsFromPoint(e.clientX, e.clientY).find(x => x.hasAttribute?.('data-foto') && sez.contains(x)) || null
      if (!elem && !foto) { nascondiTraPoco(); return }
      clearTimeout(tNascondi)
      const id = sez.getAttribute('data-blocco')
      // Un elemento che ha il posto per una foto ma non la foto: la si aggiunge da qui.
      const dati = elem && !foto ? blocchiOra.find(b => b?.id === sez.getAttribute('data-blocco'))?.data?.[elem.lista]?.[elem.indice] : null
      const fotoVuota = dati && typeof dati === 'object' ? ['image_url', 'photo_url', 'logo_url'].find(k => typeof dati[k] === 'string' && !dati[k].trim()) : null
      const percorsoFoto = foto ? percorsoDi(foto) : fotoVuota ? [elem.lista, elem.indice, fotoVuota] : null
      const chiave = id + '|' + (elem?.k || '') + '|' + JSON.stringify(percorsoFoto)
      const r = (elem?.box || foto).getBoundingClientRect()
      if (mostrato?.chiave !== chiave) {
        const quanti = elem ? (blocchiOra.find(b => b?.id === id)?.data?.[elem.lista]?.length || 0) : 0
        // In colonna o in fila? Lo dice dove sta l'elemento accanto.
        const altro = elem && elementiDi(sez).find(x => x.lista === elem.lista && Math.abs(x.indice - elem.indice) === 1)
        const inFila = !!altro && Math.abs(altro.box.getBoundingClientRect().top - r.top) < r.height / 2
        const pulsante = (az, titolo, dentro, spento) => '<button type="button" data-az="' + az + '" title="' + titolo + '"' + (spento ? ' disabled' : '') + '>' + dentro + '</button>'
        const girata = gradi => '<span style="display:flex;transform:rotate(' + gradi + 'deg)">' + ICONE.freccia + '</span>'
        attrezzi.innerHTML = (elem ? (
          pulsante('prima', 'Sposta prima', girata(inFila ? -90 : 0), elem.indice === 0) +
          pulsante('dopo', 'Sposta dopo', girata(inFila ? 90 : 180), elem.indice >= quanti - 1) +
          pulsante('duplica', 'Aggiungine un altro (una copia di questo)', ICONE.copia) +
          pulsante('elimina', 'Togli questo elemento', ICONE.cestino)) : '') +
          (foto ? pulsante('foto', 'Cambia questa foto', ICONE.foto + (elem ? '' : ' Cambia foto')) : fotoVuota ? pulsante('foto', 'Aggiungi una foto a questo elemento', ICONE.foto) : '')
        mostrato = { chiave, id, elem, percorsoFoto }
      }
      attrezzi.style.display = 'flex'
      const soloFoto = !elem
      attrezzi.className = 'ev-attrezzi' + (soloFoto ? ' ev-foto' : r.top < 44 / scalaOra ? ' ev-dentro' : '')
      attrezzi.style.left = (soloFoto ? r.left + 10 / scalaOra : r.right) + window.scrollX + 'px'
      attrezzi.style.top = (soloFoto ? Math.min(r.bottom, window.innerHeight) - 10 / scalaOra : Math.max(r.top, 0)) + window.scrollY + 'px'
    }
    const muove = e => { ultimoMovimento = e; if (!inAttesa) { inAttesa = true; requestAnimationFrame(guarda) } }
    const suAttrezzi = e => {
      const b = e.target.closest?.('button'); if (!b || b.disabled || !mostrato) return
      e.preventDefault(); e.stopPropagation()
      const m = mostrato
      if (b.dataset.az === 'foto') parla({ tipo: 'oltrenova:cambia-foto', id: m.id, percorso: m.percorsoFoto })
      else if (m.elem) parla({ tipo: 'oltrenova:elemento-azione', id: m.id, lista: m.elem.lista, indice: m.elem.indice, azione: b.dataset.az })
      nascondi()
    }
    attrezzi.addEventListener('click', suAttrezzi)
    // Tenere il dito sugli attrezzi non deve togliere il cursore dal testo.
    attrezzi.addEventListener('mousedown', e => e.preventDefault())

    // ── La barra della formattazione, sopra il paragrafo in cui si scrive ──
    const formato = document.createElement('div')
    formato.className = 'ev-formato'
    formato.innerHTML = '<button type="button" data-f="bold" title="Grassetto (Ctrl+B)"><b>G</b></button>' +
      '<button type="button" data-f="italic" title="Corsivo (Ctrl+I)"><i>C</i></button>' +
      '<button type="button" data-f="link" title="Metti un link sulle parole selezionate">' + ICONE.link + '</button>' +
      '<span class="ev-nota"></span>' +
      '<input type="text" placeholder="https://…  oppure  /pagina" style="display:none">' +
      '<button type="button" data-f="ok" style="display:none">OK</button><button type="button" data-f="via" style="display:none">Togli link</button>'
    document.body.appendChild(formato)
    const nota = formato.querySelector('.ev-nota'), campoLink = formato.querySelector('input')
    const NOTA = 'Invio va a capo · Esc per uscire'
    let selezione = null
    const rigaLink = aperta => {
      campoLink.style.display = aperta ? '' : 'none'
      formato.querySelector('[data-f="ok"]').style.display = aperta ? '' : 'none'
      formato.querySelector('[data-f="via"]').style.display = aperta && campoLink.value ? '' : 'none'
      nota.style.display = aperta ? 'none' : ''
    }
    function mostraFormato(el) {
      const r = el.getBoundingClientRect(), sotto = r.top < 60 / scalaOra
      rigaLink(false); nota.textContent = NOTA
      formato.className = 'ev-formato' + (sotto ? ' ev-sotto' : '')
      formato.style.display = 'flex'
      formato.style.left = r.left + window.scrollX + 'px'
      formato.style.top = (sotto ? r.bottom + 8 / scalaOra : r.top - 8 / scalaOra) + window.scrollY + 'px'
    }
    function nascondiFormato() { formato.style.display = 'none'; selezione = null }
    const linkSotto = nodo => { const el = nodo?.nodeType === 1 ? nodo : nodo?.parentElement; return el?.closest?.('a') || null }
    const rimettiSelezione = () => {
      const el = ricco?.el; if (!el || !selezione) return false
      el.focus()
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(selezione)
      return true
    }
    const suFormato = e => {
      const b = e.target.closest?.('button'); const el = ricco?.el || inScrittura()
      if (!b || !el?.hasAttribute('data-ricco')) return
      e.preventDefault(); e.stopPropagation()
      if (!preparaRicco(el)) return
      const f = b.dataset.f
      if (f === 'bold' || f === 'italic') { document.execCommand(f); return }
      if (f === 'link') {
        const s = window.getSelection(); if (!s.rangeCount || !ricco.el.contains(s.anchorNode)) return
        const gia = linkSotto(s.anchorNode)
        if (s.isCollapsed && !gia) { nota.textContent = 'Seleziona prima le parole da collegare'; return }
        if (gia && ricco.el.contains(gia)) { const r = document.createRange(); r.selectNodeContents(gia); s.removeAllRanges(); s.addRange(r) }
        selezione = s.getRangeAt(0).cloneRange()
        campoLink.value = gia?.getAttribute('href') || ''
        rigaLink(true); campoLink.focus()
        return
      }
      if (f === 'via') { if (rimettiSelezione()) document.execCommand('unlink'); rigaLink(false); nota.textContent = NOTA; return }
      if (f === 'ok') confermaLink()
    }
    function confermaLink() {
      let indirizzo = campoLink.value.trim()
      if (!indirizzo) { if (rimettiSelezione()) document.execCommand('unlink'); rigaLink(false); return }
      if (!/^(https?:|mailto:|tel:|\/|#)/i.test(indirizzo)) indirizzo = (indirizzo.includes('@') && !indirizzo.includes('/') ? 'mailto:' : 'https://') + indirizzo
      if (!indirizzoAmmesso(indirizzo)) { campoLink.value = ''; campoLink.placeholder = 'Indirizzo non valido: riprova'; return }
      if (rimettiSelezione()) document.execCommand('createLink', false, indirizzo)
      rigaLink(false); nota.textContent = NOTA
    }
    formato.addEventListener('click', suFormato)
    // I pulsanti non devono togliere il cursore dal paragrafo; il campo del link sì.
    formato.addEventListener('mousedown', e => { if (e.target !== campoLink) e.preventDefault() })
    campoLink.addEventListener('keydown', e => {
      e.stopPropagation()
      if (e.key === 'Enter') { e.preventDefault(); confermaLink() }
      else if (e.key === 'Escape') { e.preventDefault(); rigaLink(false); rimettiSelezione() }
    })
    // Dal campo del link si esce altrove: il paragrafo si chiude come da un'uscita normale.
    formato.addEventListener('focusout', e => {
      if (!ricco || e.relatedTarget === ricco.el || (e.relatedTarget && formato.contains(e.relatedTarget))) return
      nascondiFormato(); chiudiRicco(ridisegnaOra)
    })

    // ── Il menu del tasto destro su una sezione ──
    const menu = document.createElement('div')
    menu.className = 'ev-menu'
    document.body.appendChild(menu)
    function chiudiMenu() { menu.style.display = 'none' }
    const destro = e => {
      const sez = e.target?.closest?.('[data-blocco]'); if (!sez) return
      // Mentre si scrive vale il menu del browser: lì ci sono copia e incolla del testo.
      if (inScrittura() && inScrittura().contains(e.target)) return
      e.preventDefault(); nascondi()
      const id = sez.getAttribute('data-blocco')
      const tutte = [...document.querySelectorAll('[data-blocco]')]
      const i = tutte.indexOf(sez)
      let appunti = false; try { appunti = !!window.localStorage.getItem(APPUNTI) } catch {}
      parla({ tipo: 'oltrenova:blocco-scelto', id })
      const voce = (az, testo, tasti, spento) => '<button type="button" data-az="' + az + '"' + (spento ? ' disabled' : '') + '>' + testo + '<small>' + (tasti || '') + '</small></button>'
      const condivisa = (sez.getAttribute('data-nome') || '').startsWith('Sezione condivisa')
      menu.innerHTML = voce('duplica', 'Duplica', 'Ctrl+D') + voce('copia', 'Copia', 'Ctrl+C') + voce('incolla', 'Incolla qui sotto', 'Ctrl+V', !appunti) + '<hr>' +
        (blocchiOra.find(b => b?.id === id)?._riscrivi === true ? voce('riscrivi', "Riscrivi i testi con l'AI…") : '') +
        (condivisa ? voce('stacca', 'Stacca da questa pagina') : voce('condividi', 'Rendi condivisa…')) + '<hr>' +
        voce('aggiungi', 'Aggiungi un blocco qui sopra') + voce('su', 'Sposta su', '', i === 0) + voce('giu', 'Sposta giù', '', i === tutte.length - 1) + '<hr>' + voce('elimina', 'Elimina', 'Canc')
      menu.dataset.id = id
      menu.style.display = 'flex'
      menu.style.left = Math.max(4, Math.min(e.clientX, window.innerWidth - 226 / scalaOra)) + 'px'
      menu.style.top = Math.max(4, Math.min(e.clientY, window.innerHeight - 336 / scalaOra)) + 'px'
    }
    const sulMenu = e => {
      const b = e.target.closest?.('button'); if (!b || b.disabled) return
      e.preventDefault(); e.stopPropagation()
      const id = menu.dataset.id
      if (b.dataset.az === 'aggiungi') parla({ tipo: 'oltrenova:aggiungi-qui', prima: id })
      else parla({ tipo: 'oltrenova:blocco-azione', id, azione: b.dataset.az })
      chiudiMenu()
    }
    menu.addEventListener('click', sulMenu)
    const scorre = () => { chiudiMenu(); nascondi(); if (ricco && formato.style.display !== 'none' && document.activeElement === ricco.el) mostraFormato(ricco.el) }
    const altriTasti = e => { if (e.target?.closest?.('[data-campo]')) e.stopPropagation() }
    const incolla = e => {
      const el = e.target?.closest?.('[data-campo]'); if (!el) return
      e.preventDefault()
      if (el.hasAttribute('data-ricco') && !preparaRicco(el)) return
      document.execCommand('insertText', false, (e.clipboardData?.getData('text/plain') || '').replace(/\r?\n/g, ' '))
    }
    // Un testo dentro un link non si trascina via: ci si scrive.
    const nonTrascinare = e => { if (e.target?.closest?.('[data-campo]')) e.preventDefault() }

    // Dove cadrebbe ciò che si sta trascinando: prima della sezione sotto il
    // puntatore se si è nella sua metà alta, altrimenti dopo.
    const dove = y => {
      const sezioni = [...document.querySelectorAll('[data-blocco]')]
      for (const s of sezioni) {
        const r = s.getBoundingClientRect()
        if (y < r.top + r.height / 2) return { prima: s.getAttribute('data-blocco'), y: r.top }
      }
      const ultima = sezioni[sezioni.length - 1]
      return { prima: null, y: ultima ? ultima.getBoundingClientRect().bottom : 120 }
    }
    const eNostro = e => [...(e.dataTransfer?.types || [])].includes(TIPO_TRASCINATO)
    const sopra = e => {
      if (!eNostro(e)) return
      e.preventDefault()
      document.documentElement.classList.add('ev-trascina')
      const d = dove(e.clientY)
      linea.style.display = 'block'
      linea.style.top = Math.max(0, Math.min(window.innerHeight - 4, d.y)) + 'px'
      // Vicino ai bordi la pagina scorre, così si arriva a ogni punto senza mollare.
      const margine = 70 / scalaOra
      if (e.clientY < margine) window.scrollBy(0, -18 / scalaOra)
      else if (e.clientY > window.innerHeight - margine) window.scrollBy(0, 18 / scalaOra)
    }
    const rilascio = e => {
      if (!eNostro(e)) return
      e.preventDefault()
      linea.style.display = 'none'
      document.documentElement.classList.remove('ev-trascina')
      parla({ tipo: 'oltrenova:blocco-rilasciato', cosa: e.dataTransfer.getData(TIPO_TRASCINATO), prima: dove(e.clientY).prima })
    }
    const fuori = e => { if (!e.relatedTarget) { linea.style.display = 'none'; document.documentElement.classList.remove('ev-trascina') } }
    const fine = () => { linea.style.display = 'none'; document.documentElement.classList.remove('ev-trascina') }

    document.addEventListener('click', clic, true)
    document.addEventListener('submit', invio, true)
    document.addEventListener('focusin', entra, true)
    document.addEventListener('input', scrive, true)
    document.addEventListener('beforeinput', primaDiScrivere, true)
    document.addEventListener('selectionchange', cursoreMosso)
    document.addEventListener('focusout', esce, true)
    document.addEventListener('keydown', tasto, true)
    document.addEventListener('keyup', altriTasti, true)
    document.addEventListener('keypress', altriTasti, true)
    document.addEventListener('paste', incolla, true)
    document.addEventListener('dragstart', nonTrascinare, true)
    document.addEventListener('mousemove', muove)
    document.addEventListener('contextmenu', destro)
    window.addEventListener('scroll', scorre, true)
    window.addEventListener('blur', chiudiMenu)
    document.addEventListener('dragover', sopra)
    document.addEventListener('drop', rilascio)
    document.addEventListener('dragleave', fuori)
    document.addEventListener('dragend', fine)
    return () => {
      document.removeEventListener('click', clic, true)
      document.removeEventListener('submit', invio, true)
      document.removeEventListener('focusin', entra, true)
      document.removeEventListener('input', scrive, true)
      document.removeEventListener('beforeinput', primaDiScrivere, true)
      document.removeEventListener('selectionchange', cursoreMosso)
      if (ricco) { const r = ricco; ricco = null; r.el.replaceChildren(...r.originali) }
      formato.remove()
      document.removeEventListener('focusout', esce, true)
      document.removeEventListener('keydown', tasto, true)
      document.removeEventListener('keyup', altriTasti, true)
      document.removeEventListener('keypress', altriTasti, true)
      document.removeEventListener('paste', incolla, true)
      document.removeEventListener('dragstart', nonTrascinare, true)
      document.removeEventListener('mousemove', muove)
      document.removeEventListener('contextmenu', destro)
      window.removeEventListener('scroll', scorre, true)
      window.removeEventListener('blur', chiudiMenu)
      clearTimeout(tNascondi); attrezzi.remove(); menu.remove()
      document.documentElement.classList.remove('ev-trascina')
      for (const el of document.querySelectorAll('[data-foto]')) el.removeAttribute('data-foto')
      document.removeEventListener('dragover', sopra)
      document.removeEventListener('drop', rilascio)
      document.removeEventListener('dragleave', fuori)
      document.removeEventListener('dragend', fine)
      stile.remove(); linea.remove()
      for (const el of document.querySelectorAll('[data-campo]')) { el.removeAttribute('data-campo'); el.removeAttribute('contenteditable'); el.removeAttribute('spellcheck') }
      document.documentElement.style.removeProperty('--ev-s')
    }
  }, [attivo, telefono])

  // La sezione scelta dal pannello (appena aggiunta, o spostata) si porta a vista.
  useEffect(() => {
    if (!attivo || !scelto) return
    const t = setTimeout(() => {
      const el = [...document.querySelectorAll('[data-blocco]')].find(x => x.getAttribute('data-blocco') === scelto)
      const r = el?.getBoundingClientRect()
      if (r && (r.bottom < 80 || r.top > window.innerHeight - 80)) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 60)
    return () => clearTimeout(t)
  }, [attivo, scelto])
}

// Una sezione della pagina vista dall'editor: l'involucro che la rende
// sceglibile, e sopra quella scelta i comandi. Un blocco che non disegna niente
// (ancora vuoto) resta visibile, altrimenti non si potrebbe scegliere.
const NOMI_FOTO = { image_url: 'Aggiungi la foto', bg_image_url: 'Aggiungi la foto di sfondo', photo_url: 'Aggiungi la foto', logo_url: 'Aggiungi il logo', before_url: 'Aggiungi la foto «prima»', after_url: 'Aggiungi la foto «dopo»' }
export function sezionePerEditor(el, blocco, editor, { primo, ultimo, dopo = null }) {
  const scelto = editor.selezionato === blocco.id
  const telefono = editor.telefono === true
  // I posti per una foto che ci sono e sono ancora vuoti, più «un'altra foto» nelle gallerie.
  const fotoDaMettere = campiImmagine(blocco.data, { ancheVuoti: true }).filter(c => c.percorso.length === 1 && !c.valore.trim()).map(c => ({ percorso: c.percorso, nome: NOMI_FOTO[c.percorso[0]] || 'Aggiungi la foto' }))
  if (Array.isArray(blocco.data?.images)) fotoDaMettere.push({ percorso: ['images', blocco.data.images.length], nome: 'Aggiungi una foto alla galleria' })
  const azione = (e, quale) => { e.preventDefault(); e.stopPropagation(); parla({ tipo: 'oltrenova:blocco-azione', id: blocco.id, azione: quale }) }
  return (
    <div key={blocco.id} data-blocco={blocco.id} data-nome={blocco.type === 'sezione' && blocco._nome ? `Sezione condivisa · ${String(blocco._nome).slice(0, 60)}` : blockLabel(blocco.type)} className={'ev-blocco' + (scelto ? ' ev-scelto' : '') + (el ? '' : ' ev-senza')}>
      {el || <div className="ev-vuoto">«{blockLabel(blocco.type)}» {cosaManca(blocco.type)}</div>}
      <button type="button" className={'ev-piu' + (primo ? ' ev-piu-primo' : '')} title="Aggiungi un blocco qui"
        onClick={e => { e.preventDefault(); e.stopPropagation(); parla({ tipo: 'oltrenova:aggiungi-qui', prima: blocco.id }) }}><Plus size={17} strokeWidth={2} /></button>
      {fotoDaMettere.length > 0 && (
        <div className="ev-aggiungi-foto">
          {fotoDaMettere.map(f => (
            <button key={f.percorso.join('.')} type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); parla({ tipo: 'oltrenova:cambia-foto', id: blocco.id, percorso: f.percorso }) }}>
              <ImagePlus size={15} strokeWidth={1.5} /> {f.nome}
            </button>
          ))}
        </div>
      )}
      {(ultimo || (telefono && scelto)) && (
        <button type="button" className={'ev-piu ev-piu-sotto' + (ultimo ? ' ev-piu-ultimo' : '')} title={ultimo ? 'Aggiungi un blocco in fondo' : 'Aggiungi un blocco qui sotto'} data-piu-sotto
          onClick={e => { e.preventDefault(); e.stopPropagation(); parla({ tipo: 'oltrenova:aggiungi-qui', prima: ultimo ? null : dopo }) }}><Plus size={17} strokeWidth={2} /></button>
      )}
      {scelto && !telefono && (
        <div className="ev-binario">
          <div className="ev-barra">
            <span draggable title="Trascina per spostare"
              onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData(TIPO_TRASCINATO, 'sposta:' + blocco.id); e.dataTransfer.effectAllowed = 'move' }}>
              <GripVertical size={17} strokeWidth={1.5} />
            </span>
            <button type="button" title="Sposta su" disabled={primo} onClick={e => azione(e, 'su')}><ArrowUp size={17} strokeWidth={1.5} /></button>
            <button type="button" title="Sposta giù" disabled={ultimo} onClick={e => azione(e, 'giu')}><ArrowDown size={17} strokeWidth={1.5} /></button>
            <button type="button" title="Duplica" onClick={e => azione(e, 'duplica')}><Copy size={16} strokeWidth={1.5} /></button>
            <button type="button" title="Elimina" onClick={e => azione(e, 'elimina')}><Trash2 size={16} strokeWidth={1.5} /></button>
          </div>
        </div>
      )}
    </div>
  )
}

// Il punto scelto col «+» (o la pagina ancora vuota): dice che lì si può far
// cadere un blocco e offre di chiederlo all'AI. Qui si scrive solo la
// richiesta: la manda il pannello, che sa in che punto va e cosa farne.
export function PuntoScelto({ ai, primo = false, telefono = false }) {
  const [aperto, setAperto] = useState(false)
  const [testo, setTesto] = useState('')
  const qui = useRef(null), campo = useRef(null)
  useEffect(() => {
    const r = qui.current?.getBoundingClientRect()
    if (r && (r.top < 80 || r.bottom > window.innerHeight - 40)) qui.current.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [])
  useEffect(() => { if (aperto) campo.current?.focus({ preventScroll: true }) }, [aperto])
  const lavora = ai?.lavora === true
  const chiedi = () => { const richiesta = testo.trim(); if (richiesta.length >= 3 && !lavora) parla({ tipo: 'oltrenova:chiedi-ai', richiesta }) }
  return (
    <div ref={qui} data-punto-scelto className={'ev-qui' + (primo ? ' ev-inizio' : '')}>
      {!primo && !lavora && <button type="button" className="ev-qui-chiudi" title="Lascia stare" onClick={() => parla({ tipo: 'oltrenova:punto-chiuso' })}><X strokeWidth={1.5} /></button>}
      {!aperto ? (
        <>
          <div className="ev-qui-titolo">{telefono ? (primo ? 'Qui va la prima sezione' : 'Qui va la sezione nuova') : primo ? 'Trascina qui il primo blocco' : 'Trascina qui il tuo blocco'}</div>
          <div className="ev-qui-sotto">{telefono ? 'scegline una dall\'elenco qui sotto, oppure' : 'dalla colonna a sinistra, oppure'}</div>
          <button type="button" className="ev-qui-ai" data-chiedi-ai onClick={() => setAperto(true)}><Sparkles strokeWidth={1.5} /> Chiedi all'AI</button>
        </>
      ) : (
        <>
          <div className="ev-qui-titolo">Che sezione ti serve?</div>
          <textarea ref={campo} value={testo} maxLength={800} disabled={lavora} data-richiesta-ai
            placeholder="Per esempio: le domande frequenti sulle prenotazioni · i nostri tre servizi principali · una galleria di foto"
            onChange={e => setTesto(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); chiedi() } else if (e.key === 'Escape' && !lavora) setAperto(false) }} />
          {ai?.errore && !lavora && <div className="ev-qui-errore" data-errore-ai>{ai.errore}</div>}
          <div className="ev-qui-riga">
            <button type="button" className="ev-qui-ai" data-crea-sezione disabled={lavora || testo.trim().length < 3} onClick={chiedi}><Sparkles strokeWidth={1.5} /> {lavora ? 'Sto scrivendo la sezione…' : 'Crea la sezione'}</button>
            {!lavora && <button type="button" className="ev-qui-indietro" onClick={() => setAperto(false)}>Indietro</button>}
          </div>
          <div className="ev-qui-sotto">Sceglie il blocco più adatto e lo scrive con i dati della tua attività. Prezzi, nomi e recensioni non li inventa: li lascia da completare. Finché non premi «Salva», sul sito non cambia niente.</div>
        </>
      )}
    </div>
  )
}
