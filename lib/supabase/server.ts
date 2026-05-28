import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Returns a Supabase client that reads and writes auth cookies automatically.
// Use in Server Components, Server Actions, and Route Handlers.
// In Server Components (read-only cookie context), setAll silently no-ops — this is expected.
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component context is read-only. Cookie writes are handled
            // by Server Actions and Route Handlers where cookies() is writable.
          }
        },
      },
    }
  )
}
