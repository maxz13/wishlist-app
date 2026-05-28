'use server'

import { headers } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type CreateInviteState =
  | { inviteUrl?: string; error?: string }
  | undefined

export async function createInviteAction(): Promise<CreateInviteState> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Не авторизован' }
  }

  // 32 random bytes → 43-char base64url token. Satisfies CHECK (length(token) >= 24).
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  const token = Buffer.from(array).toString('base64url')

  const { error } = await supabase
    .from('invites')
    .insert({ token, inviter_user_id: user.id, invited_email: null })

  if (error) {
    console.error('[createInviteAction] Supabase insert error:', error)
    const detail =
      process.env.NODE_ENV === 'development'
        ? ` (${error.code}: ${error.message})`
        : ''
    return { error: `Не удалось создать ссылку. Попробуйте ещё раз.${detail}` }
  }

  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const forwarded = headersList.get('x-forwarded-proto')
  const protocol = forwarded ? forwarded.split(',')[0].trim() : 'http'
  const inviteUrl = `${protocol}://${host}/invite/${token}`

  return { inviteUrl }
}
