'use client'

// Il campo «per quante persone».
//
// ⛔ Era un `type="number"` con `parseInt(valore) || 1`: appena si cancellava
// l'«1» il campo lo rimetteva da solo, e la cifra scritta dopo gli si accodava
// — chi voleva 5 posti ne prenotava 15. Segnalato da più ospiti di Garage 22.
//
// Ora il campo può restare vuoto mentre si scrive: quello che contiene è testo,
// e diventa un numero solo quando serve (`numeroPosti`). Toccandolo si seleziona
// quello che c'è, così la cifra nuova sostituisce la vecchia invece di seguirla.
// `inputMode` apre comunque il tastierino numerico sul telefono.
export default function CampoPosti({ value, onChange, ...resto }) {
  return (
    <input type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off"
      value={value}
      onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 3))}
      onFocus={e => e.target.select()}
      {...resto} />
  )
}

// Il numero scritto nel campo, o `null` se non c'è un numero da 1 in su.
export function numeroPosti(valore) {
  const n = Number(valore)
  return valore !== '' && Number.isInteger(n) && n >= 1 ? n : null
}
