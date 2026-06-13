'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const CreateWishlistSchema = z.object({
  title:      z.string().min(1, 'Введите название').trim(),
  visibility: z.enum(['all_friends', 'family', 'private']),
})

export type CreateWishlistState =
  | { errors?: { title?: string[]; expires_on?: string[] }; message?: string; success?: boolean }
  | undefined

export async function createWishlistAction(
  _prevState: CreateWishlistState,
  formData: FormData
): Promise<CreateWishlistState> {
  const validated = CreateWishlistSchema.safeParse({
    title:      formData.get('title'),
    visibility: formData.get('visibility'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const rawDate = (formData.get('expires_on') as string)?.trim() || ''
  let expiresOn: string | null = null
  if (rawDate) {
    const match = rawDate.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
    if (!match) {
      return { errors: { expires_on: ['Введите дату в формате ДД.ММ.ГГГГ'] } }
    }
    const [, dd, mm, yyyy] = match
    const date = new Date(`${yyyy}-${mm}-${dd}`)
    if (isNaN(date.getTime())) {
      return { errors: { expires_on: ['Неверная дата'] } }
    }
    const todayUtc = new Date().toISOString().slice(0, 10)
    if (`${yyyy}-${mm}-${dd}` < todayUtc) {
      return { errors: { expires_on: ['Дата не может быть в прошлом'] } }
    }
    if (parseInt(yyyy, 10) > 2099) {
      return { errors: { expires_on: ['Слишком оптимистично, укажите реальный срок'] } }
    }
    expiresOn = `${yyyy}-${mm}-${dd}`
  }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { message: 'Не авторизован' }
  }

  const { error } = await supabase.from('wishlists').insert({
    title:      validated.data.title,
    owner_id:   user.id,
    visibility: validated.data.visibility,
    expires_on: expiresOn,
  })

  if (error) {
    return { message: 'Не удалось создать вишлист. Попробуйте ещё раз.' }
  }

  // User has seen the expiration UI in the creation form — dismiss the migration guide if still pending.
  await supabase
    .from('profiles')
    .update({ wishlist_expiration_guide_completed_at: new Date().toISOString() })
    .eq('id', user.id)
    .is('wishlist_expiration_guide_completed_at', null)

  revalidatePath('/wishlists')
  revalidatePath('/home')
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
    is_visible: true,
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

export async function toggleWishlistItemVisibilityAction(
  itemId: string,
  wishlistId: string
): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Не авторизован' }

  // Single query: fetch current is_visible and verify ownership via inner join.
  // Returns null if item not found, wishlist not found, or caller is not the owner.
  const { data: itemRow } = await supabase
    .from('wishlist_items')
    .select('is_visible, wishlists!inner(owner_id)')
    .eq('id', itemId)
    .eq('wishlist_id', wishlistId)
    .eq('wishlists.owner_id', user.id)
    .single()

  if (!itemRow) return { error: 'Элемент не найден или нет доступа' }

  const { error } = await supabase
    .from('wishlist_items')
    .update({ is_visible: !(itemRow.is_visible as boolean) })
    .eq('id', itemId)

  if (error) return { error: 'Не удалось изменить. Попробуйте ещё раз.' }

  revalidatePath(`/wishlists/${wishlistId}`)
  return {}
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

export async function archiveWishlistAction(formData: FormData): Promise<void> {
  const wishlistId = formData.get('wishlist_id') as string | null
  if (!wishlistId) return
  const supabase = await createServerSupabaseClient()
  await supabase.from('wishlists').update({ is_archived: true }).eq('id', wishlistId)
  revalidatePath(`/wishlists/${wishlistId}`)
  revalidatePath('/wishlists')
  revalidatePath('/home')
}

export async function restoreWishlistAction(formData: FormData): Promise<void> {
  const wishlistId = formData.get('wishlist_id') as string | null
  if (!wishlistId) return
  const supabase = await createServerSupabaseClient()
  await supabase.from('wishlists').update({ is_archived: false }).eq('id', wishlistId)
  revalidatePath(`/wishlists/${wishlistId}`)
  revalidatePath('/wishlists')
  revalidatePath('/home')
}

export async function updateWishlistTitleAction(
  wishlistId: string,
  newTitle: string
): Promise<{ error?: string }> {
  const trimmed = newTitle.trim()
  if (!trimmed) return { error: 'Введите название' }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Не авторизован' }

  const { error } = await supabase
    .from('wishlists')
    .update({ title: trimmed })
    .eq('id', wishlistId)
    .eq('owner_id', user.id)

  if (error) return { error: 'Не удалось сохранить. Попробуйте ещё раз.' }

  revalidatePath('/wishlists')
  revalidatePath(`/wishlists/${wishlistId}`)
  revalidatePath('/home')
  return {}
}

export async function updateWishlistVisibilityAction(
  wishlistId: string,
  visibility: string,
  friendIds: string[]
): Promise<{ error?: string }> {
  if (!['all_friends', 'family', 'private', 'selected_friends'].includes(visibility)) {
    return { error: 'Неверный тип доступа' }
  }

  // Adjustment: selected_friends with no friends selected → treat as private
  const effectiveVisibility =
    visibility === 'selected_friends' && friendIds.length === 0 ? 'private' : visibility

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Не авторизован' }

  const { error: updateError } = await supabase
    .from('wishlists')
    .update({ visibility: effectiveVisibility })
    .eq('id', wishlistId)
    .eq('owner_id', user.id)
  if (updateError) return { error: 'Не удалось сохранить. Попробуйте ещё раз.' }

  // Replace access list (delete all, then insert selected)
  await supabase.from('wishlist_access').delete().eq('wishlist_id', wishlistId)
  if (effectiveVisibility === 'selected_friends' && friendIds.length > 0) {
    const { error: insertError } = await supabase
      .from('wishlist_access')
      .insert(friendIds.map((uid) => ({ wishlist_id: wishlistId, user_id: uid })))
    if (insertError) return { error: 'Не удалось обновить список. Попробуйте ещё раз.' }
  }

  revalidatePath('/wishlists')
  revalidatePath(`/wishlists/${wishlistId}`)
  revalidatePath('/home')
  return {}
}

export async function deleteWishlistAction(
  wishlistId: string
): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Не авторизован' }

  const { error } = await supabase
    .from('wishlists')
    .delete()
    .eq('id', wishlistId)
    .eq('owner_id', user.id)

  if (error) return { error: 'Не удалось удалить. Попробуйте ещё раз.' }

  revalidatePath('/wishlists')
  revalidatePath('/home')
  return {}
}

export async function updateWishlistExpirationAction(
  wishlistId: string,
  rawDate: string
): Promise<{ error?: string }> {
  let expiresOn: string | null = null
  const trimmed = rawDate.trim()
  if (trimmed) {
    const match = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
    if (!match) return { error: 'Введите дату в формате ДД.ММ.ГГГГ' }
    const [, dd, mm, yyyy] = match
    const date = new Date(`${yyyy}-${mm}-${dd}`)
    if (isNaN(date.getTime())) return { error: 'Неверная дата' }
    const dateStr = `${yyyy}-${mm}-${dd}`
    const todayUtc = new Date().toISOString().slice(0, 10)
    if (dateStr < todayUtc) return { error: 'Дата не может быть в прошлом' }
    if (parseInt(yyyy, 10) > 2099) return { error: 'Слишком оптимистично, укажите реальный срок' }
    expiresOn = dateStr
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Не авторизован' }

  const { error } = await supabase
    .from('wishlists')
    .update({ expires_on: expiresOn })
    .eq('id', wishlistId)
    .eq('owner_id', user.id)

  if (error) return { error: 'Не удалось сохранить. Попробуйте ещё раз.' }

  revalidatePath(`/wishlists/${wishlistId}`)
  revalidatePath('/wishlists')
  revalidatePath('/home')
  return {}
}

export async function markWishlistSeenAction(wishlistId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  await supabase.rpc('mark_wishlist_access_seen', { p_wishlist_id: wishlistId })
  revalidatePath('/wishlists')
}

export async function leaveWishlistAction(formData: FormData): Promise<void> {
  const wishlistId = formData.get('wishlist_id') as string | null
  if (!wishlistId) return
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase.rpc('leave_wishlist_access', { p_wishlist_id: wishlistId })
  if (error) return
  revalidatePath('/wishlists')
  redirect('/wishlists')
}
