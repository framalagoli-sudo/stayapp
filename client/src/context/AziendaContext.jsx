import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { apiFetch } from '../lib/api'

const AziendaContext = createContext(null)

export function AziendaProvider({ children }) {
  const { profile } = useAuth()
  const [azienda, setAzienda] = useState(null)
  const [strutture, setStrutture] = useState([])
  const [ristoranti, setRistoranti] = useState([])
  const [attivita, setAttivita] = useState([])
  const [selectedStrutturaId, _setSelectedStrutturaId] = useState(null)
  const [selectedRistoranteId, _setSelectedRistoranteId] = useState(null)
  const [selectedAttivitaId, _setSelectedAttivitaId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) { setLoading(false); return }
    loadData()
  }, [profile?.id, profile?.azienda_id])

  async function loadData() {
    setLoading(true)
    try {
      // staff con azienda_id = company-level staff, carica dati azienda come admin_azienda
      // super_admin non carica entità — usa AziendePage per navigare tra i clienti
      if (profile.role === 'super_admin') {
        setLoading(false)
        return
      }

      const isAziendaRole = ['admin_azienda', 'super_admin'].includes(profile.role) ||
        (profile.role === 'staff' && !!profile.azienda_id)

      if (!isAziendaRole) {
        // legacy staff/admin_struttura con property_id
        _setSelectedStrutturaId(profile.property_id)
        setLoading(false)
        return
      }

      const promises = [apiFetch('/api/properties'), apiFetch('/api/ristoranti'), apiFetch('/api/attivita')]
      if (profile.azienda_id) promises.unshift(apiFetch(`/api/aziende/${profile.azienda_id}`))

      const results = await Promise.all(promises)

      let allStrutture = [], allRistoranti = [], allAttivita = []
      if (profile.azienda_id) {
        setAzienda(results[0])
        allStrutture = results[1] || []
        allRistoranti = results[2] || []
        allAttivita = results[3] || []
      } else {
        allStrutture = results[0] || []
        allRistoranti = results[1] || []
        allAttivita = results[2] || []
      }

      // Per staff: filtra alle entità permesse (ID specifici; vuoto = tutte)
      if (profile.role === 'staff') {
        const perm = profile.permissions || {}
        if (perm.struttura_ids?.length) allStrutture = allStrutture.filter(s => perm.struttura_ids.includes(s.id))
        if (perm.ristorante_ids?.length) allRistoranti = allRistoranti.filter(r => perm.ristorante_ids.includes(r.id))
        if (perm.attivita_ids?.length) allAttivita = allAttivita.filter(a => perm.attivita_ids.includes(a.id))
      }

      setStrutture(allStrutture)
      setRistoranti(allRistoranti)
      setAttivita(allAttivita)
      _setSelectedStrutturaId(id => id || allStrutture[0]?.id || null)
      _setSelectedRistoranteId(id => id || allRistoranti[0]?.id || null)
      _setSelectedAttivitaId(id => id || allAttivita[0]?.id || null)
    } catch (e) {
      console.error('AziendaContext load error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function refresh() { await loadData() }

  function setSelectedStrutturaId(id) { _setSelectedStrutturaId(id) }
  function setSelectedRistoranteId(id) { _setSelectedRistoranteId(id) }
  function setSelectedAttivitaId(id) { _setSelectedAttivitaId(id) }

  return (
    <AziendaContext.Provider value={{
      azienda, strutture, ristoranti, attivita,
      selectedStrutturaId, setSelectedStrutturaId,
      selectedRistoranteId, setSelectedRistoranteId,
      selectedAttivitaId, setSelectedAttivitaId,
      loading, refresh,
    }}>
      {children}
    </AziendaContext.Provider>
  )
}

export function useAzienda() {
  return useContext(AziendaContext)
}
