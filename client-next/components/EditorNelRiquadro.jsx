'use client'
import { useEffect } from 'react'
import { ArrowUp, ArrowDown, Copy, Trash2, GripVertical } from 'lucide-react'
import { blockLabel } from '@/lib/blockTypes'

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

// Accende i comportamenti dell'editor sulla pagina. `editor` = null fuori dal
// pannello: in quel caso non succede niente.
export function useEditorNelRiquadro(editor) {
  const attivo = !!editor
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
    document.addEventListener('dragover', sopra)
    document.addEventListener('drop', rilascio)
    document.addEventListener('dragleave', fuori)
    document.addEventListener('dragend', fine)
    return () => {
      document.removeEventListener('click', clic, true)
      document.removeEventListener('submit', invio, true)
      document.removeEventListener('dragover', sopra)
      document.removeEventListener('drop', rilascio)
      document.removeEventListener('dragleave', fuori)
      document.removeEventListener('dragend', fine)
      stile.remove(); linea.remove()
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
      {el || <div className="ev-vuoto">«{blockLabel(blocco.type)}» è ancora vuoto: clicca qui e riempilo dalla colonna a sinistra.</div>}
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
