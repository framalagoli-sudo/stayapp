'use client'
import GalleriaFoto from './GalleriaFoto'

// La galleria delle strutture. Era una delle cinque copie del caricatore di
// foto: ora è solo l'indirizzo a cui mandarle, il resto sta in `GalleriaFoto`.
export default function GallerySection({ gallery = [], onChange }) {
  return (
    <GalleriaFoto
      foto={gallery}
      onChange={onChange}
      endpoint="/api/upload/gallery"
      nota="Le foto vengono salvate automaticamente."
    />
  )
}
