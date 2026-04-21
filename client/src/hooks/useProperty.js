import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'

export function useProperty() {
  const { profile } = useAuth()
  const [property, setProperty] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    if (profile?.property_id) load()
    else if (profile) setLoading(false)
  }, [profile?.property_id])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('properties')
      .select('*')
      .eq('id', profile.property_id)
      .single()
    setProperty(data || null)
    setLoading(false)
  }

  async function save(updates) {
    setSaving(true)
    setSaved(false)
    setSaveError(null)
    try {
      const data = await apiFetch(`/api/properties/${profile.property_id}`, {
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

  return { property, setProperty, loading, saving, saved, saveError, save, propertyId: profile?.property_id }
}
