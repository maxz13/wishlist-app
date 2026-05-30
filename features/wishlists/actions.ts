'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const CreateWishlistSchema = z.object({
  title: z.string().min(1, 'Введите название').trim(),
})

export type CreateWishlistState =
  | { errors?: { title?: string[] }; message?: string; success?: boolean }
  | undefined

export async function createWishlistAction(
  _prevState: CreateWishlistState,
  formData: FormData
): Promise<CreateWishlistState> {
  const validated = CreateWishlistSchema.safeParse({
    title: formData.get('title'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { message: 'Не авторизован' }
  }

  const { error } = await supabase
    .from('wishlists')
    .insert({ title: validated.data.title, owner_id: user.id })

  if (error) {
    return { message: 'Не удалось создать вишлист. Попробуйте ещё раз.' }
  }

  revalidatePath('/wishlists')
  return { success: true }
}

export type CreateWishlistItemState =
  | {
      errors?: { title?: string[]; link?: string[]; price?: string[] }
      message?: string
      success?: boolean
    }
  | undefined

export async function createWishlistItemAction(
  wishlistId: string,
  formData: FormData
): Promise<CreateWishlistItemState> {
  const titleResult = z
    .string()
    .min(1, 'Введите название')
    .trim()
    .safeParse(formData.get('title'))

  if (!titleResult.success) {
    return { errors: { title: titleResult.error.flatten().formErrors } }
  }

  const rawLink = (formData.get('link') as string)?.trim() || null
  const rawPrice = (formData.get('price') as string)?.trim() || null

  if (rawLink) {
    try {
      new URL(rawLink)
    } catch {
      return { errors: { link: ['Введите корректный URL'] } }
    }
  }

  let priceValue: number | null = null
  if (rawPrice) {
    const parsed = parseFloat(rawPrice)
    if (isNaN(parsed) || parsed < 0) {
      return { errors: { price: ['Введите корректную цену'] } }
    }
    priceValue = Math.round(parsed * 100) / 100
  }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { message: 'Не авторизован' }
  }

  const { error } = await supabase.from('wishlist_items').insert({
    wishlist_id: wishlistId,
    title: titleResult.data,
    link: rawLink,
    price: priceValue,
  })

  if (error) {
    return { message: 'Не удалось добавить желание. Попробуйте ещё раз.' }
  }

  revalidatePath(`/wishlists/${wishlistId}`)
  return { success: true }
}

export type UpdateWishlistItemState =
  | {
      errors?: { title?: string[]; link?: string[]; price?: string[] }
      message?: string
      success?: boolean
    }
  | undefined

export async function updateWishlistItemAction(
  itemId: string,
  wishlistId: string,
  formData: FormData
): Promise<UpdateWishlistItemState> {
  const titleResult = z
    .string()
    .min(1, 'Введите название')
    .trim()
    .safeParse(formData.get('title'))

  if (!titleResult.success) {
    return { errors: { title: titleResult.error.flatten().formErrors } }
  }

  const rawLink = (formData.get('link') as string)?.trim() || null
  const rawPrice = (formData.get('price') as string)?.trim() || null

  if (rawLink) {
    try {
      new URL(rawLink)
    } catch {
      return { errors: { link: ['Введите корректный URL'] } }
    }
  }

  let priceValue: number | null = null
  if (rawPrice) {
    const parsed = parseFloat(rawPrice)
    if (isNaN(parsed) || parsed < 0) {
      return { errors: { price: ['Введите корректную цену'] } }
    }
    priceValue = Math.round(parsed * 100) / 100
  }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { message: 'Не авторизован' }

  const { error } = await supabase
    .from('wishlist_items')
    .update({ title: titleResult.data, link: rawLink, price: priceValue })
    .eq('id', itemId)

  if (error) {
    return { message: 'Не удалось сохранить. Попробуйте ещё раз.' }
  }

  revalidatePath(`/wishlists/${wishlistId}`)
  revalidatePath(`/wishlists/${wishlistId}/items/${itemId}`)
  return { success: true }
}

export async function deleteWishlistItemAction(
  itemId: string,
  wishlistId: string
): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Не авторизован' }

  const { error } = await supabase
    .from('wishlist_items')
    .delete()
    .eq('id', itemId)

  if (error) {
    return { error: 'Не удалось удалить. Попробуйте ещё раз.' }
  }

  revalidatePath(`/wishlists/${wishlistId}`)
  redirect(`/wishlists/${wishlistId}`)
}

export async function reserveItemAction(
  itemId: string,
  wishlistId: string
): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Не авторизован' }

  const { error } = await supabase
    .from('reservations')
    .insert({ wishlist_item_id: itemId, reserved_by_user_id: user.id })

  if (error) {
    return { error: 'Не удалось зарезервировать. Попробуйте ещё раз.' }
  }

  revalidatePath(`/wishlists/${wishlistId}`)
  return {}
}

export async function unreserveItemAction(
  itemId: string,
  wishlistId: string
): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Не авторизован' }

  const { error } = await supabase
    .from('reservations')
    .delete()
    .eq('wishlist_item_id', itemId)
    .eq('reserved_by_user_id', user.id)

  if (error) {
    return { error: 'Не удалось отменить. Попробуйте ещё раз.' }
  }

  revalidatePath(`/wishlists/${wishlistId}`)
  return {}
}
