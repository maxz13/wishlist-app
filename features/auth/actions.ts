'use server'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  LoginSchema,
  RegisterSchema,
  type LoginFormState,
  type RegisterFormState,
} from './schemas'

function sanitizeNext(raw: FormDataEntryValue | null): string {
  return typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//')
    ? raw
    : '/home'
}

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const validated = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: validated.data.email,
    password: validated.data.password,
  })

  if (error) {
    return { message: 'Неверный email или пароль' }
  }

  redirect(sanitizeNext(formData.get('next')))
}

export async function registerAction(
  _prevState: RegisterFormState,
  formData: FormData
): Promise<RegisterFormState> {
  const validated = RegisterSchema.safeParse({
    name: formData.get('name'),
    surname: formData.get('surname'),
    username: formData.get('username'),
    email: formData.get('email'),
    password: formData.get('password'),
    birthday: formData.get('birthday'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { name, surname, username, email, password, birthday } = validated.data

  const next = sanitizeNext(formData.get('next'))

  const supabase = await createServerSupabaseClient()

  // Pre-check username availability via SECURITY DEFINER RPC.
  // Callable by unauthenticated users; UNIQUE constraint is the final guard.
  const { data: usernameAvailable, error: rpcError } = await supabase.rpc(
    'is_username_available',
    { p_username: username }
  )
  if (rpcError) {
    console.error('[registerAction] is_username_available error (username=%s):', username, rpcError)
    return { message: `Ошибка регистрации. Попробуйте ещё раз.` }
  }
  if (!usernameAvailable) {
    return { errors: { username: ['Этот никнейм уже занят'] } }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Passed as raw_user_meta_data — picked up by the handle_new_user trigger
      data: { name, surname, birthday, username },
    },
  })

  if (error) {
    console.error('[registerAction] Supabase signUp error:', error)
    const detail =
      process.env.NODE_ENV === 'development'
        ? ` (${error.status ?? '?'}: ${error.message})`
        : ''
    return { message: `Ошибка регистрации. Попробуйте ещё раз.${detail}` }
  }

  // If Supabase returns a session immediately (email confirmation disabled),
  // the user is authenticated — send them directly to their intended destination.
  if (data.session) {
    redirect(next)
  }

  // Email confirmation is required — no active session yet.
  // Sign out defensively in case a partial session was set.
  await supabase.auth.signOut()

  return {
    success: true,
    message:
      'Письмо с подтверждением отправлено. Перейдите по ссылке в письме для активации аккаунта.',
  }
}

export type ForgotPasswordState = { message?: string; success?: boolean } | undefined
export type ResetPasswordState = { message?: string } | undefined

export async function requestPasswordResetAction(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = (formData.get('email') as string)?.trim()
  if (!email) return { message: 'Введите email' }

  const supabase = await createServerSupabaseClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.simplewish.es'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  })

  if (error) return { message: 'Не удалось отправить письмо. Попробуйте ещё раз.' }
  return { success: true, message: 'Письмо с инструкциями отправлено. Проверьте почту.' }
}

export async function resetPasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const password = (formData.get('password') as string)?.trim()
  if (!password || password.length < 8) {
    return { message: 'Пароль должен содержать не менее 8 символов' }
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) return { message: 'Не удалось обновить пароль. Попробуйте ещё раз.' }

  redirect('/home')
}

export async function logoutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  redirect('/login')
}
