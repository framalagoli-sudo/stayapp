'use client'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim(),
  // Le passkey sono dietro un interruttore esplicito della libreria: senza questo
  // registerPasskey/signInWithPasskey lanciano invece di funzionare.
  { auth: { experimental: { passkey: true } } }
)