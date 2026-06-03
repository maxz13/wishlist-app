import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as
    | 'signup'
    | 'email'
    | 'recovery'
    | 'invite'
    | null

  // For the PKCE code flow, Supabase stores the verifier with a "/recovery" suffix
  // when the code was issued for password recovery. Read it before the exchange so
  // we can route to /reset-password instead of /home.
  const verifierCookie = code
    ? request.cookies.getAll().find((c) => c.name.endsWith('-code-verifier'))
    : undefined

  // Determine destination up front; return early if we have nothing to process.
  const dest =
    code && verifierCookie?.value?.endsWith('/recovery') ? '/reset-password'
    : code ? '/home'
    : tokenHash && type === 'recovery' ? '/reset-password'
    : tokenHash && type ? '/home'
    : null

  if (!dest) {
    return NextResponse.redirect(new URL('/login?error=1', origin))
  }

  // Create the response first so the Supabase client can write session cookies
  // directly onto it via response.cookies.set(). Using next/headers cookieStore
  // here would NOT propagate Set-Cookie headers into a manually constructed
  // NextResponse — this was causing the session to be lost after the redirect.
  const response = NextResponse.redirect(new URL(dest, origin))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          ),
      },
    }
  )

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return response
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) return response
  }

  return NextResponse.redirect(new URL('/login?error=1', origin))
}
