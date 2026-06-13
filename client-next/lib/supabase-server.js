import { createClient } from '@supabase/supabase-js'

// Client con service role key — bypassa RLS — solo per API routes server-side
// Non importare mai in componenti client o Server Components pubblici
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)
