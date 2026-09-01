'use client'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

// «L'ho configurato, ma si vede?»
//
// È la domanda che in questo pannello si pone in molti punti: una risorsa
// prenotabile senza il widget sul sito, delle offerte senza il blocco offerte,
// dei prodotti senza la vetrina. Ogni volta il cliente ha fatto il suo lavoro —
// creato, riempito, attivato — e **non se ne accorge nessuno**, perché manca un
// passaggio che esiste ma è invisibile.
//
// Non è un guasto: è un passo che nessuno gli ha detto. E un cliente che apre
// il proprio sito e non trova quello che ha appena configurato non pensa «mi
// manca un blocco»: pensa che il prodotto non funzioni.
//
// ⚠️ Scritto per essere **riusato**. Francesco: «vedrai che quando andremo a
// rivedere ogni sezione lo metteremo un po' ovunque». Perciò non sa niente
// delle risorse: gli si dice quale blocco cercare e cosa scrivere.
//
// ⚠️ Se non riusciamo a sapere com'è fatto il sito, **non si dice niente**.
// Un avviso mostrato per errore — «non si vede» quando invece si vede — è
// peggio del silenzio: insegna a ignorare gli avvisi.
export default function AvvisoNonSiVede({
  entityTipo, entityId, blocco, titolo, spiegazione, azione = 'Vai al sito', quando = true,
}) {
  const [manca, setManca] = useState(false)

  useEffect(() => {
    if (!quando || !entityTipo || !entityId || !blocco) { setManca(false); return }
    let vivo = true
    apiFetch(`/api/pagine/blocchi-usati?entity_tipo=${encodeURIComponent(entityTipo)}&entity_id=${encodeURIComponent(entityId)}`)
      .then(d => { if (vivo) setManca(Array.isArray(d?.blocchi) && !d.blocchi.includes(blocco)) })
      .catch(() => { if (vivo) setManca(false) })
    return () => { vivo = false }
  }, [entityTipo, entityId, blocco, quando])

  if (!manca) return null

  return (
    <div style={riquadro}>
      <div style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }} aria-hidden="true">👁️</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: '#7c4a03', marginBottom: 3 }}>{titolo}</div>
        <div style={{ fontSize: 13.5, color: '#8a5a12', lineHeight: 1.6 }}>{spiegazione}</div>
      </div>
      {/* Il collegamento porta dove si risolve, non a una pagina generica: un
          avviso che dice «vai a sistemare» senza dire dove è solo un rimprovero. */}
      <a href={`/admin/${entityTipo === 'ristorante' ? 'ristoranti' : entityTipo}/${entityId}/pagine`}
        style={bottone}>{azione} →</a>
    </div>
  )
}

const riquadro = {
  display: 'flex', alignItems: 'flex-start', gap: 12,
  background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10,
  padding: '13px 16px', marginBottom: 16, flexWrap: 'wrap',
}
const bottone = {
  padding: '7px 13px', background: '#fff', border: '1px solid #e0c988',
  borderRadius: 8, color: '#7c4a03', fontSize: 13, fontWeight: 600,
  textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap',
}
