'use client'

import { createBrowserClient } from '@supabase/ssr'

// createBrowserClient maintains an internal singleton per URL+key.
// Safe to call multiple times. Stores session in cookies (not localStorage),
// making it compatible with Server Components.
export function getSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
