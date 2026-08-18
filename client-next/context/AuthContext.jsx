'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

// Il token dice con quale metodo si e' entrati: una passkey e' legata al dominio
// e non e' rigiocabile da un sito civetta, quindi vale come accesso completo.
function sessioneDaPasskey(session) {
  try {
    const amr = JSON.parse(atob(session.access_token.split('.')[1])).amr || []
    return amr.some(m => m?.method === 'passkey' || m?.method === 'webauthn')
  } catch { return false }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [aalStatus, setAalStatus] = useState(null) // { currentLevel, nextLevel }
  const [require2fa, setRequire2fa] = useState(false)
  const [conPasskey, setConPasskey] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setConPasskey(sessioneDaPasskey(session))
      if (session?.user) { fetchProfile(session.user.id); refreshAAL() }
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setConPasskey(sessioneDaPasskey(session))
      if (session?.user) { fetchProfile(session.user.id); refreshAAL() }
      else { setProfile(null); setAalStatus(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('id, role, full_name, property_id, group_id, azienda_id, permissions')
      .eq('id', userId)
      .single()
    setProfile(data)
    if (data?.azienda_id) {
      const { data: az } = await supabase.from('aziende').select('require_2fa').eq('id', data.azienda_id).single()
      setRequire2fa(!!az?.require_2fa)
    } else {
      setRequire2fa(false)
    }
    setLoading(false)
  }

  async function refreshAAL() {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    setAalStatus(data)
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, aalStatus, require2fa, conPasskey, refreshAAL, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
