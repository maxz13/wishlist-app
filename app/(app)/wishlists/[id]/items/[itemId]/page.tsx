import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ItemEditForm } from '@/features/wishlists/item-form'

type WishlistItem = {
  id: string
  title: string
  link: string | null
  price: number | null
  is_visible: boolean
}

export default async function WishlistItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; itemId: string }>
  searchParams: Promise<{ fromFriend?: string }>
}) {
  const { id: wishlistId, itemId } = await params
  const { fromFriend } = await searchParams

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch wishlist first so isOwner is known before the item query.
  const { data: wishlist } = await supabase
    .from('wishlists')
    .select('owner_id')
    .eq('id', wishlistId)
    .single()

  if (!wishlist) notFound()

  const isOwner = wishlist.owner_id === user!.id

  // Friends only see visible items; explicit filter matches product behavior.
  let itemQuery = supabase
    .from('wishlist_items')
    .select('id, title, link, price, is_visible')
    .eq('id', itemId)
    .eq('wishlist_id', wishlistId)

  if (!isOwner) {
    itemQuery = itemQuery.eq('is_visible', true)
  }

  const { data: itemData } = await itemQuery.single()

  if (!itemData) notFound()

  const item = itemData as WishlistItem

  const backHref = fromFriend
    ? `/wishlists/${wishlistId}?fromFriend=${fromFriend}`
    : `/wishlists/${wishlistId}`

  return (
    <main className="px-4 pb-10 pt-4">
      <Link href={backHref} className="text-sm text-gray-600">
        ‹ Назад
      </Link>

      {isOwner ? (
        <ItemEditForm item={item} wishlistId={wishlistId} backHref={backHref} />
      ) : (
        <div className="mt-3">
          <h1 className="text-xl font-bold leading-tight">{item.title}</h1>
          <div className="mt-4 flex flex-col gap-2">
            {item.price !== null && (
              <p className="text-sm text-gray-700">
                {item.price.toLocaleString('ru-RU')} ₽
              </p>
            )}
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-700 underline"
              >
                {item.link}
              </a>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
