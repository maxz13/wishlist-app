import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { CreateItemSection } from '@/features/wishlists/create-item-section'
import { CircleMarker } from '@/features/wishlists/circle-marker'
import { OwnerItemList } from '@/features/wishlists/owner-item-list'
import { ReserveButton } from '@/features/wishlists/reserve-button'
import {
  ReservationControls,
  type ReservationState,
} from '@/features/wishlists/reservation-controls'
import { archiveWishlistAction, restoreWishlistAction } from '@/features/wishlists/actions'

type WishlistItem = {
  id: string
  title: string
  link: string | null
  price: number | null
  is_visible: boolean
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
    .select('id, title, owner_id, is_archived')
    .eq('id', id)
    .single()

  if (!wishlist) notFound()

  const isOwner = wishlist.owner_id === user!.id

  let itemsQuery = supabase
    .from('wishlist_items')
    .select('id, title, link, price, is_visible')
    .eq('wishlist_id', id)
    .order('is_visible', { ascending: false })
    .order('created_at', { ascending: true })

  if (!isOwner) {
    itemsQuery = itemsQuery.eq('is_visible', true)
  }

  const { data: itemsData } = await itemsQuery
  const items = (itemsData ?? []) as WishlistItem[]
  const backHref =
    !isOwner && fromFriend ? `/friends/${fromFriend}` : '/wishlists'

  const reservationByItemId = new Map<string, string>()
  const reserverNameByItemId = new Map<string, string>()

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

    // For friend view: resolve first names of other users' reservations.
    if (!isOwner && reservationByItemId.size > 0) {
      const otherReserverIds = [
        ...new Set(
          [...reservationByItemId.values()].filter((rid) => rid !== user!.id)
        ),
      ]

      if (otherReserverIds.length > 0) {
        const { data: reserverProfiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', otherReserverIds)

        const nameById = new Map<string, string>(
          (reserverProfiles ?? []).map((p) => [p.id as string, p.name as string])
        )

        for (const [itemId, reserverId] of reservationByItemId) {
          const name = nameById.get(reserverId)
          if (name) reserverNameByItemId.set(itemId, name)
        }
      }
    }
  }

  return (
    <main className="px-4 pb-10 pt-4">
      <Link href={backHref} className="text-sm text-gray-600">
        ‹ Назад
      </Link>

      <h1 className="mt-3 text-xl font-bold leading-tight">{wishlist.title}</h1>

      <div className="mt-5">
        {isOwner && items.length > 0 && (
          <OwnerItemList
            items={items}
            wishlistId={id}
            reservedItemIds={Array.from(reservationByItemId.keys())}
          />
        )}

        {!isOwner && items.length > 0 && (
          <div className="divide-y divide-gray-100">
            {items.map((item) => {
              const reserverId = reservationByItemId.get(item.id) ?? null
              const reservationState: ReservationState = !reserverId
                ? 'unreserved'
                : reserverId === user!.id
                  ? 'mine'
                  : 'other'

              return (
                <div key={item.id} className="flex items-start gap-3 py-2.5">
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
                            {item.price.toLocaleString('ru-RU')} €
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
                    {reservationState !== 'unreserved' && (
                      <ReservationControls
                        itemId={item.id}
                        wishlistId={id}
                        state={reservationState}
                        reserverName={reserverNameByItemId.get(item.id)}
                      />
                    )}
                  </div>
                  {reservationState === 'unreserved' && (
                    <ReserveButton itemId={item.id} wishlistId={id} />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {items.length === 0 && !isOwner && (
          <p className="py-3 text-sm text-gray-600">Список пока пуст.</p>
        )}

        {isOwner && <CreateItemSection wishlistId={id} />}

        {isOwner && items.length > 0 && (
          <div className="mt-6 flex flex-col gap-1.5 border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2">
              <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-500">
                <svg width="8" height="6" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                  <path
                    d="M1 4l3 3 5-6"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="text-xs text-gray-400">виден друзьям</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 shrink-0 rounded-full border-2 border-gray-300" />
              <span className="text-xs text-gray-400">черновик, скрыт от друзей</span>
            </div>
          </div>
        )}

        {isOwner && (
          <div className="mt-6 border-t border-gray-100 pt-4">
            {wishlist.is_archived ? (
              <form action={restoreWishlistAction}>
                <input type="hidden" name="wishlist_id" value={id} />
                <button type="submit" className="text-sm text-gray-500">
                  Восстановить из архива
                </button>
              </form>
            ) : (
              <form action={archiveWishlistAction}>
                <input type="hidden" name="wishlist_id" value={id} />
                <button type="submit" className="text-sm text-gray-400">
                  Архивировать
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

