import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { CreateItemSection } from '@/features/wishlists/create-item-section'
import { CircleMarker } from '@/features/wishlists/circle-marker'
import { OwnerItemRow } from '@/features/wishlists/owner-item-row'
import {
  ReservationControls,
  type ReservationState,
} from '@/features/wishlists/reservation-controls'

type WishlistItem = {
  id: string
  title: string
  link: string | null
  price: number | null
}

export default async function WishlistDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ fromFriend?: string }>
}) {
  const { id } = await params
  const { fromFriend } = await searchParams

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: wishlist } = await supabase
    .from('wishlists')
    .select('id, title, owner_id')
    .eq('id', id)
    .single()

  if (!wishlist) notFound()

  const { data: itemsData } = await supabase
    .from('wishlist_items')
    .select('id, title, link, price')
    .eq('wishlist_id', id)
    .order('created_at', { ascending: true })

  const items = (itemsData ?? []) as WishlistItem[]
  const isOwner = wishlist.owner_id === user!.id
  const backHref =
    !isOwner && fromFriend ? `/friends/${fromFriend}` : '/wishlists'

  const reservationByItemId = new Map<string, string>()

  if (items.length > 0) {
    const itemIds = items.map((item) => item.id)
    const { data: reservationsData } = await supabase
      .from('reservations')
      .select('wishlist_item_id, reserved_by_user_id')
      .in('wishlist_item_id', itemIds)

    for (const r of reservationsData ?? []) {
      reservationByItemId.set(
        r.wishlist_item_id as string,
        r.reserved_by_user_id as string,
      )
    }
  }

  return (
    <main className="px-4 pb-10 pt-4">
      <Link href={backHref} className="text-sm text-gray-600">
        ‹ Назад
      </Link>

      <h1 className="mt-3 text-xl font-bold leading-tight">{wishlist.title}</h1>

      <div className="mt-5">
        {items.length > 0 && (
          <div className="divide-y divide-gray-100">
            {items.map((item) => {
              const reserverId = reservationByItemId.get(item.id) ?? null
              const reservationState: ReservationState = !reserverId
                ? 'unreserved'
                : reserverId === user!.id
                  ? 'mine'
                  : 'other'

              return isOwner ? (
                <OwnerItemRow
                  key={item.id}
                  item={item}
                  wishlistId={id}
                />
              ) : (
                <div key={item.id} className="flex items-start gap-3 py-3.5">
                  <CircleMarker
                    state={reservationState}
                    itemId={item.id}
                    wishlistId={id}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium leading-snug text-gray-900">
                      {item.title}
                    </p>
                    {(item.price !== null || item.link) && (
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3">
                        {item.price !== null && (
                          <span className="text-xs text-gray-700">
                            {item.price.toLocaleString('ru-RU')} ₽
                          </span>
                        )}
                        {item.link && (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-700 underline"
                          >
                            ссылка ↗
                          </a>
                        )}
                      </div>
                    )}
                    <ReservationControls
                      itemId={item.id}
                      wishlistId={id}
                      state={reservationState}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {items.length === 0 && !isOwner && (
          <p className="py-3 text-sm text-gray-600">Список пока пуст.</p>
        )}

        {isOwner && <CreateItemSection wishlistId={id} />}
      </div>
    </main>
  )
}

