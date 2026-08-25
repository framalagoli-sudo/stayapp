'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

// Carica e salva un'entità, qualunque sia il suo tipo.
//
// Prima c'erano tre hook quasi identici — `useProperty`, `useRistorante`,
// `useAttivita` — e ognuno sapeva parlare con una tabella sola. È il motivo per
// cui lo schermo del menù apparteneva ai ristoranti e quello dei servizi alle
// strutture: non era una scelta di prodotto, era il codice che non sapeva fare
// altrimenti.
//
// Ora lo schermo riceve il tipo e questo hook chiama la route giusta. Le route
// restituiscono tutte la stessa forma, quindi da qui in poi non c'è differenza.

const API = { struttura: '/api/properties', ristorante: '/api/ristoranti', attivita: '/api/attivita' }

// L'id arriva dall'URL (`/admin/<tipo>/:id/...`). Se manca, si ripiega sulla
// struttura assegnata al profilo: è il vecchio percorso `/admin/property/*`,
// usato da chi amministra una struttura sola, e deve continuare a funzionare.
export function useEntita(tipo, idEsplicito = null) {
  const params = useParams()
  const { profile } = useAuth()
  const id = idEsplicito || params?.id || (tipo === 'struttura' ? profile?.property_id : null)
  const [entita, setEntita] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => { if (id && API[tipo]) carica() }, [id, tipo])

  async function carica() {
    setLoading(true)
    try { setEntita(await apiFetch(`${API[tipo]}/${id}`)) }
    catch { setEntita(null) }
    finally { setLoading(false) }
  }

  async function save(modifiche) {
    setSaving(true); setSaved(false); setSaveError(null)
    try {
      const aggiornata = await apiFetch(`${API[tipo]}/${id}`, { method: 'PATCH', body: JSON.stringify(modifiche) })
      setEntita(aggiornata)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      return aggiornata
    } catch (e) {
      setSaveError(e?.message || 'Salvataggio non riuscito')
      throw e
    } finally { setSaving(false) }
  }

  return { entita, loading, saving, saved, saveError, save, ricarica: carica }
}
