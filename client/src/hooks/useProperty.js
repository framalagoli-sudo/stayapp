import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePropertyId } from '../context/PropertyIdContext'
import { apiFetch } from '../lib/api'

export function useProperty() {
  const { profile } = useAuth()
  const ctxId = usePropertyId() // injected by /admin/struttura/:id/* routes

  // Priority: URL-injected id → profile.property_id
  const propertyId = ctxId || profile?.property_id

  const [property, setProperty] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    if (propertyId) load()
    else if (profile) setLoading(false)
  }, [propertyId])

  async function load() {
    setLoading(true)
    try {
      const data = await apiFetch(`/api/properties/${propertyId}`)
      setProperty(data || null)
    } catch {
      setProperty(null)
    } finally {
      setLoading(false)
    }
  }

  async function save(updates) {
    setSaving(true)
    setSaved(false)
    setSaveError(null)
    try {
      const data = await apiFetch(`/api/properties/${propertyId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      setProperty(p => ({ ...p, ...data }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setSaveError(e.message || 'Errore nel salvataggio')
      throw e
    } finally {
      setSaving(false)
    }
  }

  return { property, setProperty, loading, saving, saved, saveError, save, propertyId }
}
