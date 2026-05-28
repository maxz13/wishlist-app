'use client'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | undefined

// Returns a singleton browser client.
// Call this inside Client Components or client-side hooks only.
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return client
}
