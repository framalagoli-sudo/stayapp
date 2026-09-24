'use client'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

// La categoria di ogni entità, scelta da noi (STRATEGIA.md §6.1, 24/09):
// «le funzioni le accendo io». Scegliere una categoria la applica subito:
// interruttori dell'entità dal profilo, e le funzioni dell'azienda come unione
// di quelle delle sue entità — solo quando TUTTE hanno una categoria, finché ne
// manca una l'azienda continua a vedere tutto.
//
// Una funzione che il profilo spegnerebbe ma che ha contenuti (un menù scritto,
// una vetrina con elementi) resta accesa: spegnerla toglierebbe quel contenuto
// dal sito del cliente. L'esito lo dice.

const card = { background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #eee', marginBottom: 16 }
const TIPO = { struttura: 'Struttura', ristorante: 'Ristorante', attivita: 'Attività' }

function Esito({ esito }) {
  if (!esito) return null
  if (esito.errore) return <div style={{ fontSize: 12, color: '#c0392b', marginTop: 6 }}>{esito.errore}</div>
  if (!esito.profilo) return <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>Categoria tolta: gli interruttori restano com'erano, l'azienda torna a vedere tutto.</div>
  return (
    <div style={{ fontSize: 12, color: '#555', marginTop: 6, lineHeight: 1.6 }}>
      <span style={{ color: '#2e7d32' }}>Applicata «{esito.profilo}».</span>
      {esito.accese.length > 0 && <> Accese: {esito.accese.join(', ')}.</>}
      {esito.spente.length > 0 && <> Spente: {esito.spente.join(', ')}.</>}
      {esito.tenute.length > 0 && (
        <span style={{ color: '#b7791f' }}> Lasciate accese perché hanno contenuti: {esito.tenute.map(t => `${t.funzione} (${t.contenuti})`).join(', ')}.</span>
      )}
      {esito.tenuteAzienda?.length > 0 && (
        <span style={{ color: '#b7791f' }}> Restano nel menu dell'azienda perché le ha usate: {esito.tenuteAzienda.map(t => `${t.funzione} (${t.contenuti})`).join(', ')}.</span>
      )}
    </div>
  )
}

export default function AssegnaCategorie({ aziende, onCambiato }) {
  const [profili, setProfili] = useState(null)
  const [esiti, setEsiti] = useState({})
  const [inCorso, setInCorso] = useState(null)
  const [errore, setErrore] = useState('')

  useEffect(() => {
    apiFetch('/api/admin/profili').then(setProfili).catch(e => setErrore(e?.message || 'Impossibile leggere le categorie'))
  }, [])

  async function assegna(ent, chiave) {
    setInCorso(ent.id)
    try {
      const esito = await apiFetch(`/api/admin/entita/${ent.id}/profilo`, { method: 'POST', body: JSON.stringify({ profilo: chiave || null }) })
      setEsiti(e => ({ ...e, [ent.id]: esito }))
      await onCambiato()
    } catch (e) {
      setEsiti(x => ({ ...x, [ent.id]: { errore: e?.message || 'Non riuscito' } }))
    } finally { setInCorso(null) }
  }

  if (errore) return <div style={{ ...card, color: '#c0392b' }}>{errore}</div>
  if (!profili) return <div style={{ padding: 20, color: '#888' }}>Caricamento…</div>
  const nomeProfilo = Object.fromEntries(profili.map(p => [p.chiave, p.nome]))

  return (
    <div>
      <p style={{ fontSize: 13, color: '#888', margin: '0 0 16px', maxWidth: 760 }}>
        La categoria si sceglie per ogni entità e si applica subito. Il titolare vede nel suo menu solo le funzioni
        della categoria; quelle con contenuti non si spengono mai. Finché un'entità dell'azienda è senza categoria,
        l'azienda continua a vedere tutto.
      </p>
      {aziende.filter(a => a.entita.length).map(a => {
        const tutte = a.entita.every(e => e.profilo)
        return (
          <div key={a.id} style={card}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, color: '#1a1a2e', overflowWrap: 'anywhere', minWidth: 0 }}>{a.nome}</div>
              <div style={{ fontSize: 12, color: tutte ? '#00797a' : '#b7791f' }}>
                {tutte && a.funzioni
                  ? `Funzioni dell'azienda: ${Object.keys(a.funzioni).length} accese`
                  : 'Vede tutte le funzioni (manca la categoria di qualche entità)'}
              </div>
            </div>
            {a.entita.map(e => (
              <div key={e.id} style={{ padding: '10px 0', borderTop: '1px solid #f3f3f3' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: '#1a1a2e', overflowWrap: 'anywhere' }}>{e.nome}</div>
                    <div style={{ fontSize: 11, color: '#aaa' }}>
                      {TIPO[e.tipo] || e.tipo}
                      {e.profilo && ` · versione ${e.profilo_versione} del profilo «${nomeProfilo[e.profilo] || e.profilo}»`}
                    </div>
                  </div>
                  <select value={e.profilo || ''} disabled={inCorso === e.id}
                    onChange={ev => assegna(e, ev.target.value)}
                    style={{ flex: '0 1 240px', minWidth: 0, padding: '7px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, fontFamily: 'inherit' }}>
                    <option value="">— nessuna categoria —</option>
                    {profili.map(p => <option key={p.chiave} value={p.chiave}>{p.nome}</option>)}
                  </select>
                </div>
                {inCorso === e.id && <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>Applico…</div>}
                <Esito esito={esiti[e.id]} />
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
