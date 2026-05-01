import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Missing Supabase env vars. Copy .env.example → .env and fill in your project credentials.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)
