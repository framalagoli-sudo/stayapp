import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { apiFetch } from '../lib/api'

const AziendaContext = createContext(null)

export function AziendaProvider({ children }) {
  const { profile } = useAuth()
  const [azienda, setAzienda] = useState(null)
  const [strutture, setStrutture] = useState([])
  const [ristoranti, setRistoranti] = useState([])
  const [selectedStrutturaId, _setSelectedStrutturaId] = useState(null)
  const [selectedRistoranteId, _setSelectedRistoranteId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) { setLoading(false); return }
    loadData()
  }, [profile?.id, profile?.azienda_id])

  async function loadData() {
    setLoading(true)
    try {
      const isAziendaRole = ['admin_azienda', 'super_admin'].includes(profile.role)
      if (!isAziendaRole) {
        // admin_struttura / staff: just set their fixed property
        _setSelectedStrutturaId(profile.property_id)
        setLoading(false)
        return
      }

      const promises = [apiFetch('/api/properties'), apiFetch('/api/ristoranti')]
      if (profile.azienda_id) promises.unshift(apiFetch(`/api/aziende/${profile.azienda_id}`))

      const results = await Promise.all(promises)
      if (profile.azienda_id) {
        setAzienda(results[0])
        setStrutture(results[1])
        setRistoranti(results[2])
        _setSelectedStrutturaId(id => id || results[1][0]?.id || null)
        _setSelectedRistoranteId(id => id || results[2][0]?.id || null)
      } else {
        setStrutture(results[0])
        setRistoranti(results[1])
      }
    } catch (e) {
      console.error('AziendaContext load error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function refresh() { await loadData() }

  function setSelectedStrutturaId(id) { _setSelectedStrutturaId(id) }
  function setSelectedRistoranteId(id) { _setSelectedRistoranteId(id) }

  return (
    <AziendaContext.Provider value={{
      azienda, strutture, ristoranti,
      selectedStrutturaId, setSelectedStrutturaId,
      selectedRistoranteId, setSelectedRistoranteId,
      loading, refresh,
    }}>
      {children}
    </AziendaContext.Provider>
  )
}

export function useAzienda() {
  return useContext(AziendaContext)
}
