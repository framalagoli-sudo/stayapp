'use client'
import { useRef, useState } from 'react'
import { uploadMedia } from '@/lib/api'
import UnsplashPicker from './UnsplashPicker'
import { fotoTroppoPesante } from '@/lib/formati-foto'

// Una sola galleria di foto per tutto il pannello.
//
// ⛔ Fino al 15/09/2026 lo stesso caricatore esisteva in cinque copie (galleria
// di struttura, ristorante e attività, foto dei prodotti, foto delle risorse),
// cresciute ognuna per conto suo. Quattro fermavano a 2 MB — scritti quando le
// foto si salvavano grezze, mentre dal 24/08 il server le comprime —, gli errori
// arrivavano in un `alert`, nessuna sapeva pescare da Unsplash, e solo quella
// delle risorse lasciava **riordinare**: altrove, per cambiare quale foto viene
// per prima bisognava cancellarle tutte e ricaricarle nell'ordine giusto.
//
// La base è quella delle risorse, che era la più completa.
//
// ⚠️ Dati: un elenco di indirizzi. Alcune gallerie storiche contengono oggetti
// `{ url }` (l'app delle attività li legge già entrambi): qui si mostrano, si
// spostano e si tolgono senza trasformarli — riscriverli vorrebbe dire cambiare
// la forma dei dati sotto a chi li legge.
//
// ⚠️ Definito in un file suo, fuori da ogni pagina: un componente dichiarato
// dentro un altro cambia identità a ogni render e React lo smonta e rimonta.
const indirizzo = f => (typeof f === 'string' ? f : f?.url) || ''

export default function GalleriaFoto({
  foto = [],
  onChange,
  endpoint,              // stringa, o funzione che la costruisce (serve quando dipende da una scelta fatta nella pagina)
  massimo = 10,
  unsplash = true,
  unsplashQuery = '',
  primaEtichetta,        // es. «copertina»: cosa rappresenta la prima foto, se rappresenta qualcosa
  nota,                  // riga sotto, che spiega a cosa servono queste foto
  primaDiCaricare,       // se restituisce un testo, il caricamento non parte e il testo si mostra
  incollaIndirizzo = false, // campo per aggiungere una foto dal suo indirizzo (i prodotti ce l'avevano)
}) {
  const inputRef = useRef()
  const [caricando, setCaricando] = useState(false)
  const [avvisi, setAvvisi] = useState([])
  const pieno = foto.length >= massimo

  async function aggiungi(e) {
    const scelti = Array.from(e.target.files || [])
    if (inputRef.current) inputRef.current.value = ''   // rimettere gli stessi file deve riprovare
    if (!scelti.length) return
    const blocco = primaDiCaricare?.()
    if (blocco) { setAvvisi([blocco]); return }

    const posti = massimo - foto.length
    const files = scelti.slice(0, posti)
    const problemi = []
    if (scelti.length > posti) problemi.push(`Ne ho caricate ${posti}: il massimo è ${massimo} foto.`)

    setCaricando(true)
    const nuove = []
    const url = typeof endpoint === 'function' ? endpoint() : endpoint
    // ⚠️ Un file sbagliato NON ferma gli altri. Prima un errore a metà
    // interrompeva il giro: delle dieci foto scelte ne arrivavano tre, e le
    // tre già caricate non venivano nemmeno salvate.
    for (const file of files) {
      const pesante = fotoTroppoPesante(file)
      if (pesante) { problemi.push(`«${file.name}»: ${pesante}`); continue }
      try {
        const r = await uploadMedia(url, file)
        if (r?.url) nuove.push(r.url)
        else problemi.push(`«${file.name}»: il server non ha restituito un indirizzo.`)
      } catch (err) {
        console.error('GalleriaFoto', err)
        problemi.push(`«${file.name}»: non è stato possibile caricarla. Riprova, e se continua dillo a noi.`)
      }
    }
    if (nuove.length) onChange([...foto, ...nuove])
    setAvvisi(problemi)
    setCaricando(false)
  }

  function sposta(i, verso) {
    const g = [...foto]
    const j = i + verso
    if (j < 0 || j >= g.length) return
    ;[g[i], g[j]] = [g[j], g[i]]
    onChange(g)
  }

  return (
    <div>
      {foto.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 110px), 1fr))', gap: 8, marginBottom: 10 }}>
          {foto.map((f, i) => (
            <div key={indirizzo(f) + i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid #e6e6e6', background: '#fff' }}>
              <img src={indirizzo(f)} alt="" style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }} />
              {i === 0 && primaEtichetta && foto.length > 1 && (
                <span style={{ position: 'absolute', top: 4, left: 4, background: 'rgba(0,0,0,.65)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                  {primaEtichetta}
                </span>
              )}
              <div style={{ display: 'flex', borderTop: '1px solid #eee' }}>
                <button type="button" onClick={() => sposta(i, -1)} disabled={i === 0} aria-label="Sposta indietro" style={miniBtn(i === 0)}>‹</button>
                <button type="button" onClick={() => sposta(i, 1)} disabled={i === foto.length - 1} aria-label="Sposta avanti" style={miniBtn(i === foto.length - 1)}>›</button>
                <button type="button" onClick={() => onChange(foto.filter((_, k) => k !== i))} aria-label="Togli questa foto" style={{ ...miniBtn(false), color: '#c0392b' }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" multiple onChange={aggiungi} disabled={caricando || pieno} style={{ display: 'none' }} />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={caricando || pieno}
          style={{ padding: '8px 14px', border: '1px dashed #bbb', borderRadius: 8, background: '#fafafa', cursor: caricando ? 'wait' : pieno ? 'default' : 'pointer', fontSize: 13, color: '#555', opacity: pieno ? 0.5 : 1 }}>
          {caricando ? 'Carico…' : foto.length ? '+ Aggiungi foto' : 'Carica le foto'}
        </button>
        {unsplash && !pieno && (
          <UnsplashPicker label="Unsplash" defaultQuery={unsplashQuery}
            onPick={u => { setAvvisi([]); onChange([...foto, u]) }} />
        )}
        {pieno && <span style={{ fontSize: 12, color: '#999' }}>Hai raggiunto il massimo di {massimo} foto.</span>}
      </div>

      {incollaIndirizzo && !pieno && (
        <input placeholder="Oppure incolla l’indirizzo di una foto (https://…) e premi Invio"
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}
          onBlur={e => {
            const v = e.target.value.trim()
            if (!v) return
            // Solo indirizzi web veri: questa stringa finisce in un `src` sulla
            // pagina pubblica, e `javascript:` o un percorso a caso non ci vanno.
            if (!/^https:\/\/[^\s"'<>]+$/i.test(v)) { setAvvisi(['L’indirizzo deve iniziare con https://']); return }
            setAvvisi([]); onChange([...foto, v]); e.target.value = ''
          }}
          style={{ marginTop: 8, width: '100%', border: '1px solid #eee', borderRadius: 6, padding: '6px 10px', fontSize: 12, boxSizing: 'border-box' }} />
      )}

      {avvisi.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {avvisi.map((a, i) => <p key={i} style={{ fontSize: 12, color: '#c0392b', margin: '2px 0' }}>{a}</p>)}
        </div>
      )}

      <div style={{ fontSize: 12, color: '#999', marginTop: 6, lineHeight: 1.5 }}>
        {nota ? `${nota} ` : ''}Fino a {massimo} foto, 4 MB ciascuna. Le frecce cambiano l’ordine.
      </div>
    </div>
  )
}

const miniBtn = (spento) => ({
  flex: 1, padding: '3px 0', border: 'none', background: '#fafafa',
  cursor: spento ? 'default' : 'pointer', opacity: spento ? 0.3 : 1, fontSize: 13,
})
