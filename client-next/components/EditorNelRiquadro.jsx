'use client'
import { useEffect, useLayoutEffect } from 'react'
import { ArrowUp, ArrowDown, Copy, Trash2, GripVertical, Plus } from 'lucide-react'
import { blockLabel } from '@/lib/blockTypes'
import { campiDiTesto, campiImmagine, cosaManca, LISTE } from '@/lib/editor-visuale'

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

function segnaTesti(blocks) {
  const attivo = inScrittura()
  const buoni = new Set()
  for (const sez of document.querySelectorAll('[data-blocco]')) {
    const b = blocks.find(x => x?.id === sez.getAttribute('data-blocco')); if (!b) continue
    const perTesto = new Map()
    for (const c of campiDiTesto(b.data)) {
      const t = c.valore.trim(); if (!perTesto.has(t)) perTesto.set(t, []); perTesto.get(t).push(c.percorso)
    }
    if (!perTesto.size) continue
    const perElemento = new Map()
    for (const el of sez.querySelectorAll('*')) {
      if (!(el instanceof HTMLElement) || el.childElementCount || NON_TESTI.has(el.tagName)) continue
      if (el.closest('.ev-binario, .ev-vuoto, form')) continue
      const t = testoDi(el).trim(); if (!t || !perTesto.has(t)) continue
      if (!perElemento.has(t)) perElemento.set(t, []); perElemento.get(t).push(el)
    }
    for (const [t, elementi] of perElemento) {
      const percorsi = perTesto.get(t)
      if (percorsi.length > 1 && percorsi.length !== elementi.length) continue
      elementi.forEach((el, i) => {
        buoni.add(el)
        if (el === attivo) return
        el.setAttribute('data-campo', JSON.stringify(percorsi.length > 1 ? percorsi[i] : percorsi[0]))
        el.setAttribute('contenteditable', 'plaintext-only')
        if (el.contentEditable !== 'plaintext-only') el.setAttribute('contenteditable', 'true')
        el.setAttribute('spellcheck', 'false')
      })
    }
  }
  for (const el of document.querySelectorAll('[data-campo]')) {
    if (el === attivo || buoni.has(el)) continue
    el.removeAttribute('data-campo'); el.removeAttribute('contenteditable'); el.removeAttribute('spellcheck')
  }
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
export function useEditorNelRiquadro(editor, blocks) {
  const attivo = !!editor

  // Dopo ogni disegno: si riconoscono i testi scrivibili e, se si stava
  // scrivendo, il cursore torna dov'era.
  useLayoutEffect(() => {
    if (!attivo) return
    blocchiOra = Array.isArray(blocks) ? blocks : []
    segnaTesti(blocchiOra)
    segnaImmagini(blocchiOra)
    const c = cursoreDaRimettere; cursoreDaRimettere = null
    if (!c?.dove || document.activeElement !== c.el) return
    const ora = cursoreIn(c.el)
    if (!ora || ora.da !== c.dove.da || ora.a !== c.dove.a) mettiCursore(c.el, c.dove)
  })
  const scala = editor?.scala || 1
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
      chiudiMenu()
      if (e.target.closest?.('.ev-barra, .ev-piu, .ev-attrezzi, .ev-menu')) return
      e.preventDefault(); e.stopPropagation()
      const b = e.target.closest?.('[data-blocco]')
      parla({ tipo: 'oltrenova:blocco-scelto', id: b ? b.getAttribute('data-blocco') : null })
    }
    const invio = e => { e.preventDefault(); e.stopPropagation() }

    // Scrivere su un testo della pagina: ogni battuta va al pannello, che
    // cambia il blocco. Un testo svuotato si manda solo uscendo dal campo.
    const manda = (el, anchePerVuoto) => {
      const campo = campoDi(el); if (!campo) return
      const valore = testoDi(el)
      if (!valore.trim() && !anchePerVuoto) return
      if (el.getAttribute('data-mandato') === valore) return
      el.setAttribute('data-mandato', valore)
      parla({ tipo: 'oltrenova:campo-scritto', id: campo.id, percorso: campo.percorso, valore })
    }
    const entra = e => {
      const el = e.target?.closest?.('[data-campo]'); if (!el) return
      el.setAttribute('data-disegnato', testoDi(el)); el.setAttribute('data-mandato', testoDi(el))
    }
    const scrive = e => { const el = e.target?.closest?.('[data-campo]'); if (el) manda(el, false) }
    const esce = e => {
      const el = e.target?.closest?.('[data-campo]'); if (!el) return
      // Un pezzo di testo formattato non può restare vuoto: torna com'era
      // (per toglierlo c'è la scheda, che sa togliere anche la sua formattazione).
      if (!testoDi(el).trim() && campoDi(el)?.percorso.includes('content')) el.textContent = el.getAttribute('data-disegnato') || ''
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
        // Sul posto si scrive una riga: Invio chiude. Gli a-capo e la
        // formattazione si mettono dalla scheda.
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
      const percorsoFoto = foto ? percorsoDi(foto) : null
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
          (foto ? pulsante('foto', 'Cambia questa foto', ICONE.foto + (elem ? '' : ' Cambia foto')) : '')
        mostrato = { chiave, id, elem, percorsoFoto }
      }
      attrezzi.style.display = 'flex'
      const soloFoto = !elem
      attrezzi.className = 'ev-attrezzi' + (soloFoto ? ' ev-foto' : r.top < 44 / scala ? ' ev-dentro' : '')
      attrezzi.style.left = (soloFoto ? r.left + 10 / scala : r.right) + window.scrollX + 'px'
      attrezzi.style.top = (soloFoto ? Math.min(r.bottom, window.innerHeight) - 10 / scala : Math.max(r.top, 0)) + window.scrollY + 'px'
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
      menu.innerHTML = voce('duplica', 'Duplica', 'Ctrl+D') + voce('copia', 'Copia', 'Ctrl+C') + voce('incolla', 'Incolla qui sotto', 'Ctrl+V', !appunti) + '<hr>' +
        voce('aggiungi', 'Aggiungi un blocco qui sopra') + voce('su', 'Sposta su', '', i === 0) + voce('giu', 'Sposta giù', '', i === tutte.length - 1) + '<hr>' + voce('elimina', 'Elimina', 'Canc')
      menu.dataset.id = id
      menu.style.display = 'flex'
      menu.style.left = Math.max(4, Math.min(e.clientX, window.innerWidth - 226 / scala)) + 'px'
      menu.style.top = Math.max(4, Math.min(e.clientY, window.innerHeight - 300 / scala)) + 'px'
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
    const scorre = () => { chiudiMenu(); nascondi() }
    const altriTasti = e => { if (e.target?.closest?.('[data-campo]')) e.stopPropagation() }
    const incolla = e => {
      if (!e.target?.closest?.('[data-campo]')) return
      e.preventDefault()
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
      const margine = 70 / scala
      if (e.clientY < margine) window.scrollBy(0, -18 / scala)
      else if (e.clientY > window.innerHeight - margine) window.scrollBy(0, 18 / scala)
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
  }, [attivo, scala])

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
export function sezionePerEditor(el, blocco, editor, { primo, ultimo }) {
  const scelto = editor.selezionato === blocco.id
  const azione = (e, quale) => { e.preventDefault(); e.stopPropagation(); parla({ tipo: 'oltrenova:blocco-azione', id: blocco.id, azione: quale }) }
  return (
    <div key={blocco.id} data-blocco={blocco.id} data-nome={blockLabel(blocco.type)} className={'ev-blocco' + (scelto ? ' ev-scelto' : '')}>
      {el || <div className="ev-vuoto">«{blockLabel(blocco.type)}» {cosaManca(blocco.type)}</div>}
      <button type="button" className={'ev-piu' + (primo ? ' ev-piu-primo' : '')} title="Aggiungi un blocco qui"
        onClick={e => { e.preventDefault(); e.stopPropagation(); parla({ tipo: 'oltrenova:aggiungi-qui', prima: blocco.id }) }}><Plus size={17} strokeWidth={2} /></button>
      {ultimo && (
        <button type="button" className="ev-piu ev-piu-sotto" title="Aggiungi un blocco in fondo"
          onClick={e => { e.preventDefault(); e.stopPropagation(); parla({ tipo: 'oltrenova:aggiungi-qui', prima: null }) }}><Plus size={17} strokeWidth={2} /></button>
      )}
      {scelto && (
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

export function InizioPagina() {
  return <div className="ev-inizio">Trascina qui il primo blocco dalla colonna a sinistra.</div>
}
