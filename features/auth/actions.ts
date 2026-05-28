'use server'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  LoginSchema,
  RegisterSchema,
  type LoginFormState,
  type RegisterFormState,
} from './schemas'

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

  redirect('/')
}

export async function registerAction(
  _prevState: RegisterFormState,
  formData: FormData
): Promise<RegisterFormState> {
  const validated = RegisterSchema.safeParse({
    name: formData.get('name'),
    surname: formData.get('surname'),
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { name, surname, email, password } = validated.data

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Passed as raw_user_meta_data — picked up by the handle_new_user trigger
      data: { name, surname },
    },
  })

  if (error) {
    return { message: 'Ошибка регистрации. Попробуйте ещё раз.' }
  }

  return {
    success: true,
    message:
      'Письмо с подтверждением отправлено. Перейдите по ссылке в письме для активации аккаунта.',
  }
}

export async function logoutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  redirect('/login')
}
