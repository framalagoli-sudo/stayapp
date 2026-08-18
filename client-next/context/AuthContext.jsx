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
  const [erroreProfilo, setErroreProfilo] = useState(null)

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

  // `.single()` risponde 406 quando la query non restituisce esattamente una riga,
  // e con le policy RLS può capitare legittimamente: il profilo restava null,
  // nessuno lo diceva e le pagine che ne dipendono giravano all'infinito su
  // "Caricamento…". Con `.maybeSingle()` l'assenza è un caso normale, e se il
  // profilo non arriva lo si dichiara invece di lasciare l'interfaccia sospesa.
  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, role, full_name, property_id, group_id, azienda_id, permissions')
        .eq('id', userId)
        .maybeSingle()

      if (error) throw new Error(error.message)
      setProfile(data ?? null)
      setErroreProfilo(data ? null : 'Il tuo profilo non è raggiungibile.')

      if (data?.azienda_id) {
        const { data: az, error: azErr } = await supabase
          .from('aziende').select('require_2fa').eq('id', data.azienda_id).maybeSingle()
        // Se l'azienda non è leggibile non si abbassa la guardia: meglio chiedere
        // il secondo fattore di troppo che saltarlo per un errore di lettura.
        setRequire2fa(azErr ? true : !!az?.require_2fa)
      } else {
        setRequire2fa(false)
      }
    } catch (e) {
      setProfile(null)
      setErroreProfilo(e.message || 'Errore nel caricamento del profilo.')
    } finally {
      setLoading(false)
    }
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
    <AuthContext.Provider value={{ user, profile, loading, aalStatus, require2fa, conPasskey, erroreProfilo, refreshAAL, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
