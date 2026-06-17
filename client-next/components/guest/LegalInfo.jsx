'use client'

// Riga "dati legali" per il footer del minisito: ragione sociale, P.IVA, sede e
// (per le società di capitali) REA e capitale sociale. Mostra solo i campi presenti,
// così funziona per qualsiasi tipo di business in qualsiasi Paese.
// NB: non mostriamo il codice fiscale — per le ditte individuali è il C.F. personale
// del titolare (dato personale) e non è obbligatorio sul sito; la P.IVA basta.
export default function LegalInfo({ azienda, color = 'rgba(255,255,255,0.5)', style = {} }) {
  if (!azienda) return null

  const parts = []
  if (azienda.ragione_sociale) parts.push(azienda.ragione_sociale)
  if (azienda.partita_iva) parts.push(`P.IVA ${azienda.partita_iva}`)

  const sede = [
    azienda.indirizzo,
    [azienda.cap, azienda.citta].filter(Boolean).join(' '),
    azienda.provincia ? `(${azienda.provincia})` : '',
  ].filter(Boolean).join(', ')
  if (sede) parts.push(`Sede: ${sede}`)

  if (azienda.rea) parts.push(`REA ${azienda.rea}`)
  if (azienda.capitale_sociale) parts.push(`Cap. soc. ${azienda.capitale_sociale}`)
  if (azienda.pec) parts.push(`PEC: ${azienda.pec}`)

  if (parts.length === 0) return null

  return (
    <p style={{ fontSize: 11, lineHeight: 1.6, color, margin: 0, ...style }}>
      {parts.join(' · ')}
    </p>
  )
}
