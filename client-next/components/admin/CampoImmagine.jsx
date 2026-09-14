'use client'
import { useRef, useState } from 'react'
// ⚠️ `Image` di lucide oscura la `Image` globale del browser: si importa con un
// altro nome, come già imparato altrove.
import { Image as IconaFoto, Trash2 } from 'lucide-react'
import { uploadMedia } from '@/lib/api'
import UnsplashPicker from './UnsplashPicker'
import { FocalPointPicker } from './FocalPointPicker'
import { focalValido, fotoTroppoPesante } from '@/lib/formati-foto'

// Un solo posto per caricare una foto.
//
// ⛔ Prima ce n'erano diciannove, uno per pagina, ognuno cresciuto per conto
// suo: misurato il 14/09/2026, ventisette campi immagine di cui **uno solo**
// sapeva pescare da Unsplash e **due** lasciavano scegliere il punto focale.
// Così il cliente trovava la ricerca foto costruendo una pagina e non
// caricando la galleria, poteva puntare la locandina di un evento e non la
// foto di un piatto. Non era una scelta: era il posto in cui nessuno aveva
// ancora portato il miglioramento fatto altrove.
//
// Le opzioni si dichiarano per punto — non tutte servono ovunque, e un comando
// che non fa niente è peggio di un comando assente: il `formato` su una foto
// ritagliata a cerchio non cambierebbe nulla.
//
// ⚠️ Quello che cambia davvero rispetto a prima: **un caricamento fallito lo
// dice**. Quasi tutti i caricatori vecchi inghiottivano l'errore in un `catch`
// vuoto, e il cliente restava a guardare una foto che non arrivava senza sapere
// perché.
// Il peso massimo sta in `lib/formati-foto.js`, con la misura che lo giustifica.
export function CampoImmagine({
  valore,
  onChange,
  endpoint,                 // dove va il file: gli indirizzi sono diversi per tipo di contenuto
  etichetta,
  aiuto,
  unsplash = false,
  unsplashQuery = '',
  focale,                   // valore attuale del punto focale
  onFocale,                 // se c'è, compare il selettore
  anteprima = 'largo',      // 'largo' | 'cerchio' | un rapporto ('16 / 9')
  indirizzo = false,        // mostra anche il campo con l'URL scritto
  altezza = 170,
}) {
  const inputRef = useRef()
  const [caricando, setCaricando] = useState(false)
  const [errore, setErrore] = useState(null)

  async function carica(file) {
    if (!file) return
    const pesante = fotoTroppoPesante(file)
    if (pesante) { setErrore(pesante); return }
    setCaricando(true); setErrore(null)
    try {
      const { url } = await uploadMedia(endpoint, file)
      if (!url) throw new Error('il server non ha restituito un indirizzo')
      onChange(url)
    } catch (e) {
      setErrore("Non è stato possibile caricare la foto. Riprova, e se continua dillo a noi.")
      console.error('CampoImmagine', e)
    } finally {
      setCaricando(false)
      if (inputRef.current) inputRef.current.value = ''   // rimettere lo stesso file deve riprovare
    }
  }

  const tondo = anteprima === 'cerchio'
  const stileAnteprima = tondo
    ? { width: 96, height: 96, borderRadius: '50%' }
    : { width: '100%', maxHeight: altezza, ...(anteprima !== 'largo' ? { aspectRatio: anteprima, maxHeight: 'none' } : null) }

  return (
    <div>
      {etichetta && <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 4 }}>{etichetta}</label>}
      {aiuto && <p style={{ fontSize: 11.5, color: '#888', margin: '0 0 8px', lineHeight: 1.5 }}>{aiuto}</p>}

      {valore
        ? <img src={valore} alt="" style={{ ...stileAnteprima, objectFit: 'cover', objectPosition: focalValido(focale) || 'center', borderRadius: tondo ? '50%' : 8, display: 'block', marginBottom: 8, border: '1px solid #eee' }} />
        : <div onClick={() => inputRef.current?.click()}
            style={{ ...stileAnteprima, borderRadius: tondo ? '50%' : 8, border: '2px dashed #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#aaa', fontSize: 12.5, marginBottom: 8, cursor: 'pointer', minHeight: tondo ? undefined : 110 }}>
            <IconaFoto size={18} strokeWidth={1.5} />
            {caricando ? 'Caricamento…' : 'Clicca per caricare'}
          </div>
      }

      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => carica(e.target.files?.[0])} />

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={caricando} style={bottone}>
          <IconaFoto size={13} strokeWidth={1.5} /> {caricando ? 'Caricamento…' : 'Carica'}
        </button>
        {unsplash && <UnsplashPicker label="Unsplash" defaultQuery={unsplashQuery} onPick={onChange} />}
        {valore && (
          <button type="button" onClick={() => { onChange(''); onFocale?.('') }} style={{ ...bottone, color: '#c0392b', borderColor: '#f0d4d0' }}>
            <Trash2 size={13} strokeWidth={1.5} /> Rimuovi
          </button>
        )}
      </div>

      {errore && <p style={{ fontSize: 12, color: '#c0392b', margin: '8px 0 0' }}>{errore}</p>}

      {indirizzo && (
        <input type="text" value={valore || ''} onChange={e => onChange(e.target.value)} placeholder="https://…"
          style={{ width: '100%', padding: '9px 12px', border: '1px solid #e0e0e8', borderRadius: 7, fontSize: 13, boxSizing: 'border-box', background: '#fafafa', marginTop: 8 }} />
      )}

      {onFocale && valore && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 2 }}>Punto da tenere sempre visibile</div>
          <div style={{ fontSize: 11.5, color: '#888', marginBottom: 2, lineHeight: 1.5 }}>
            La foto viene ritagliata: clicca sul soggetto e resterà lui al centro.
          </div>
          {/* `intera`: sui ritratti verticali il ritaglio nasconderebbe il viso
              proprio nell'area in cui bisogna cliccare. */}
          <FocalPointPicker src={valore} value={focale} onChange={onFocale} hint={false} intera />
        </div>
      )}
    </div>
  )
}

const bottone = {
  fontSize: 12, padding: '6px 14px', borderRadius: 6, border: '1px dashed #c8c8d8',
  background: '#fafafa', cursor: 'pointer', color: '#555',
  display: 'flex', alignItems: 'center', gap: 6,
}
