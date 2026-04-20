import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Service role client — bypass RLS for server-side operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey)
