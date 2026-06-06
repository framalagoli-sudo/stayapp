import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [aalStatus, setAalStatus] = useState(null) // { currentLevel, nextLevel }
  const [require2fa, setRequire2fa] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) { fetchProfile(session.user.id); refreshAAL() }
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
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
      .maybeSingle()
    setProfile(data)
    if (data?.azienda_id) {
      const { data: az } = await supabase.from('aziende').select('require_2fa').eq('id', data.azienda_id).maybeSingle()
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
    <AuthContext.Provider value={{ user, profile, loading, aalStatus, require2fa, refreshAAL, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
