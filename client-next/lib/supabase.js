'use client'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
)