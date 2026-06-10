'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type CreateInviteState =
  | { inviteUrl?: string; firstName?: string; error?: string }
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()
  const firstName = (profile?.name as string | null) ?? ''

  return { inviteUrl, firstName }
}

export async function sendFriendRequestAction(toUserId: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.rpc('send_friend_request', { p_to_user_id: toUserId })
  if (error) return { error: error.message }
  revalidatePath('/friends')
  return {}
}

export async function acceptFriendRequestAction(requestId: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.rpc('accept_friend_request', { p_request_id: requestId })
  if (error) return { error: error.message }
  revalidatePath('/friends')
  revalidatePath('/home')
  return {}
}

export async function declineFriendRequestAction(requestId: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.rpc('decline_friend_request', { p_request_id: requestId })
  if (error) return { error: error.message }
  revalidatePath('/friends')
  revalidatePath('/home')
  return {}
}

export async function dismissRecommendationAction(dismissedUserId: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Не авторизован' }
  const { error } = await supabase
    .from('friend_recommendation_dismissals')
    .insert({ user_id: user.id, dismissed_user_id: dismissedUserId })
  if (error && error.code !== '23505') return { error: error.message }
  revalidatePath('/friends')
  revalidatePath('/home')
  return {}
}

export async function removeFriendAction(friendId: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Не авторизован' }
  const { error } = await supabase.rpc('remove_friend', { p_friend_id: friendId })
  if (error) return { error: 'Не удалось удалить. Попробуйте ещё раз.' }
  revalidatePath('/friends')
  revalidatePath('/home')
  redirect('/friends')
}
