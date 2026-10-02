import { createClient } from "@supabase/supabase-js"

// Same Supabase project as the mobile app. The publishable (anon) key is safe in the
// browser because the database is protected by Row Level Security.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. See .env.example.")
}

export const supabase = createClient(url, key)
