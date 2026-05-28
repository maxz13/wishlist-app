import 'server-only'

import { createClient } from '@supabase/supabase-js'

// Returns a fresh client on every call.
// Use in Server Components, Server Actions, and Route Handlers.
export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
