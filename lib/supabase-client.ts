import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let supabase: SupabaseClient | null = null

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase URL or anon key is not configured; realtime features are disabled.")
} else {
  if (supabaseUrl.includes("placeholder") || supabaseKey.includes("placeholder")) {
    console.warn("Supabase is using placeholder credentials. Realtime features will not work.")
  }

  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  })
}

export { supabase }
