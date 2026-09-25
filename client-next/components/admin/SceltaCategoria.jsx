'use client'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

// La categoria di un'entità nuova, scelta da chi la crea (il super_admin).
// Decide cosa il titolare trova acceso nel pannello (STRATEGIA.md §6.1): senza,
// l'entità nasce «senza categoria» e l'azienda torna a vedere tutto.
//
// Obbligatoria nei moduli di creazione. Le categorie pensate per lo stesso tipo
// di entità stanno in cima, le altre sotto: una categoria non è legata al tipo
// (un hotel può avere il profilo «Ristorante» per il suo ristorante interno).

let cache = null

export default function SceltaCategoria({ tipo, value, onChange, style }) {
  const [profili, setProfili] = useState(cache)
  const [errore, setErrore] = useState('')

  useEffect(() => {
    if (cache) return
    apiFetch('/api/admin/profili')
      .then(lista => { cache = lista; setProfili(lista) })
      .catch(e => setErrore(e?.message || 'Categorie non disponibili'))
  }, [])

  if (errore) return <div style={{ fontSize: 12, color: '#c0392b' }}>{errore}</div>
  const stessoTipo = (profili || []).filter(p => p.tipo_entita === tipo)
  const altri = (profili || []).filter(p => p.tipo_entita !== tipo)
  return (
    <select required value={value || ''} onChange={e => onChange(e.target.value)} disabled={!profili}
      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, fontFamily: 'inherit', minWidth: 0, ...style }}>
      <option value="" disabled>{profili ? 'Categoria…' : 'Carico le categorie…'}</option>
      {stessoTipo.length > 0 && <optgroup label="Per questo tipo">{stessoTipo.map(p => <option key={p.chiave} value={p.chiave}>{p.nome}</option>)}</optgroup>}
      {altri.length > 0 && <optgroup label="Altre">{altri.map(p => <option key={p.chiave} value={p.chiave}>{p.nome}</option>)}</optgroup>}
    </select>
  )
}
