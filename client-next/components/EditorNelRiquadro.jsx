'use client'
import { useEffect, useLayoutEffect } from 'react'
import { ArrowUp, ArrowDown, Copy, Trash2, GripVertical } from 'lucide-react'
import { blockLabel } from '@/lib/blockTypes'
import { campiDiTesto, cosaManca } from '@/lib/editor-visuale'

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
    segnaTesti(Array.isArray(blocks) ? blocks : [])
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
      if (e.target.closest?.('.ev-barra')) return
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
      const el = e.target?.closest?.('[data-campo]'); if (!el) return
      e.stopPropagation()
      // Sul posto si scrive una riga: Invio chiude. Gli a-capo e la
      // formattazione si mettono dalla scheda.
      if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); el.blur() }
      else if (e.key === ' ' && el.tagName === 'BUTTON') { e.preventDefault(); document.execCommand('insertText', false, ' ') }
    }
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
      parla({ tipo: 'oltrenova:blocco-rilasciato', cosa: e.dataTransfer.getData(TIPO_TRASCINATO), prima: dove(e.clientY).prima })
    }
    const fuori = e => { if (!e.relatedTarget) linea.style.display = 'none' }
    const fine = () => { linea.style.display = 'none' }

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
