'use client'
import { createBrowserClient } from '@supabase/ssr'

// Singleton client per browser — compatibile con tutti gli import esistenti
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: true } }
)