'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const UpdateProfileSchema = z.object({
  name: z.string().min(1, 'Введите имя').trim(),
  surname: z.string().min(1, 'Введите фамилию').trim(),
})

export type UpdateProfileState =
  | { errors?: { name?: string[]; surname?: string[] }; message?: string; success?: boolean }
  | undefined

export async function updateProfileAction(
  _prevState: UpdateProfileState,
  formData: FormData
): Promise<UpdateProfileState> {
  const validated = UpdateProfileSchema.safeParse({
    name: formData.get('name'),
    surname: formData.get('surname'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const rawBirthday = (formData.get('birthday') as string)?.trim() || null

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { message: 'Не авторизован' }

  const { error } = await supabase
    .from('profiles')
    .update({
      name: validated.data.name,
      surname: validated.data.surname,
      birthday: rawBirthday,
    })
    .eq('id', user.id)

  if (error) {
    return { message: 'Не удалось сохранить. Попробуйте ещё раз.' }
  }

  revalidatePath('/profile')
  revalidatePath('/home')
  return { success: true }
}

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Введите текущий пароль'),
    newPassword: z
      .string()
      .min(8, 'Минимум 8 символов')
      .max(72, 'Максимум 72 символа'),
    confirmPassword: z.string().min(1, 'Введите подтверждение пароля'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: 'Новый пароль совпадает с текущим',
    path: ['newPassword'],
  })

export type ChangePasswordState =
  | {
      errors?: {
        currentPassword?: string[]
        newPassword?: string[]
        confirmPassword?: string[]
      }
      message?: string
      success?: boolean
    }
  | undefined

export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const validated = ChangePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword:     formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { currentPassword, newPassword } = validated.data

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) return { message: 'Не авторизован' }

  // Verify current password — Supabase Cloud does not enforce current_password
  // on updateUser, so we re-authenticate explicitly before applying the change.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email:    user.email,
    password: currentPassword,
  })

  if (signInError) {
    return { errors: { currentPassword: ['Неверный пароль'] } }
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })

  if (updateError) {
    return { message: 'Не удалось изменить пароль. Попробуйте ещё раз.' }
  }

  return { success: true }
}

export async function updateAvatarUrlAction(
  avatarUrl: string
): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Не авторизован' }

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)

  if (error) {
    return { error: 'Не удалось обновить аватар. Попробуйте ещё раз.' }
  }

  revalidatePath('/profile')
  revalidatePath('/home')
  return {}
}
