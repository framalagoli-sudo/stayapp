'use client'
import { useState } from 'react'
import { uploadMedia } from '@/lib/api'
import { fotoTroppoPesante } from '@/lib/formati-foto'

// Il caricamento di UNA foto, senza nessuna grafica.
//
// Serve alle miniature dentro le liste fitte — il piatto nel menu, l'attività,
// l'escursione — dove un campo grande come `CampoImmagine` snaturerebbe la riga
// in cui il cliente lavora. Ognuna tiene il suo aspetto; quello che condividono
// è ciò che prima ognuna sbagliava per conto suo: il peso massimo (2 MB, mentre
// il tetto vero misurato è 4), e l'errore dentro un `alert` con il messaggio
// tecnico del server, o in due casi nessun messaggio proprio.
//
// Uso:
//   const { carica, caricando, errore } = useCaricaFoto()
//   <input type="file" onChange={e => carica(endpoint, e.target.files[0], url => onChange({ photo_url: url }))} />
//   {errore && <small>{errore}</small>}
export function useCaricaFoto() {
  const [caricando, setCaricando] = useState(false)
  const [errore, setErrore] = useState(null)

  async function carica(endpoint, file, quandoFatto) {
    if (!file) return
    const pesante = fotoTroppoPesante(file)
    if (pesante) { setErrore(pesante); return }
    setCaricando(true); setErrore(null)
    try {
      const r = await uploadMedia(endpoint, file)
      if (!r?.url) throw new Error('il server non ha restituito un indirizzo')
      quandoFatto(r.url)
    } catch (e) {
      console.error('useCaricaFoto', e)
      setErrore('Non è stato possibile caricare la foto. Riprova, e se continua dillo a noi.')
    } finally {
      setCaricando(false)
    }
  }

  return { carica, caricando, errore }
}
