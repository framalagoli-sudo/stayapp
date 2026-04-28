import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

export function useAttivita(id) {
  const [attivita, setAttivita] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [saveError,setSaveError]= useState(null)

  useEffect(() => { if (id) load() }, [id])

  async function load() {
    setLoading(true)
    try {
      const data = await apiFetch(`/api/attivita/${id}`)
      setAttivita(data)
    } catch { setAttivita(null) }
    finally { setLoading(false) }
  }

  async function save(updates) {
    setSaving(true); setSaved(false); setSaveError(null)
    try {
      const data = await apiFetch(`/api/attivita/${id}`, {
        method: 'PATCH', body: JSON.stringify(updates),
      })
      setAttivita(a => ({ ...a, ...data }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setSaveError(e.message || 'Errore nel salvataggio')
      throw e
    } finally { setSaving(false) }
  }

  return { attivita, setAttivita, loading, saving, saved, saveError, save }
}
