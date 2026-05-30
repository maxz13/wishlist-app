import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type Friend = { id: string; name: string; surname: string }
type Wishlist = { id: string; title: string }
type ReservationRow = {
  reservationId: string
  itemTitle: string
  wishlistId: string
  ownerId: string
  ownerName: string
}

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Friendships
  const { data: friendships } = await supabase
    .from('friendships')
    .select('friend_id')

  const friendIds = (friendships ?? []).map((f) => f.friend_id as string)

  // Own wishlists
  const { data: wishlistsData } = await supabase
    .from('wishlists')
    .select('id, title')
    .eq('owner_id', user!.id)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  const wishlists = (wishlistsData ?? []) as Wishlist[]

  // Friend profiles (names used for both Friends section and Я подарю)
  let friends: Friend[] = []
  if (friendIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, surname')
      .in('id', friendIds)
      .order('name')
    friends = (data ?? []) as Friend[]
  }

  // My reservations
  const { data: reservationsData } = await supabase
    .from('reservations')
    .select('id, wishlist_item_id')
    .eq('reserved_by_user_id', user!.id)

  const myReservations = (reservationsData ?? []) as Array<{
    id: string
    wishlist_item_id: string
  }>

  // Reserved wishlist items
  let reservedItems: Array<{ id: string; title: string; wishlist_id: string }> = []
  if (myReservations.length > 0) {
    const reservedItemIds = myReservations.map((r) => r.wishlist_item_id)
    const { data } = await supabase
      .from('wishlist_items')
      .select('id, title, wishlist_id')
      .in('id', reservedItemIds)
    reservedItems = (data ?? []) as typeof reservedItems
  }

  // Wishlists for reserved items (friends' wishlists — needed for owner_id + archived check)
  let itemWishlists: Array<{ id: string; owner_id: string }> = []
  if (reservedItems.length > 0) {
    const itemWishlistIds = [...new Set(reservedItems.map((i) => i.wishlist_id))]
    const { data } = await supabase
      .from('wishlists')
      .select('id, owner_id')
      .in('id', itemWishlistIds)
      .eq('is_archived', false)
    itemWishlists = (data ?? []) as typeof itemWishlists
  }

  // Build lookup maps
  const profileById = new Map(friends.map((f) => [f.id, f]))
  const itemById = new Map(reservedItems.map((i) => [i.id, i]))
  const itemWishlistById = new Map(itemWishlists.map((w) => [w.id, w]))

  // Compose Я подарю rows — skip items that are drafted/archived/deleted
  const reservationRows = myReservations
    .map((r): ReservationRow | null => {
      const item = itemById.get(r.wishlist_item_id)
      if (!item) return null
      const wishlist = itemWishlistById.get(item.wishlist_id)
      if (!wishlist) return null
      const owner = profileById.get(wishlist.owner_id)
      if (!owner) return null
      return {
        reservationId: r.id,
        itemTitle: item.title,
        wishlistId: item.wishlist_id,
        ownerId: wishlist.owner_id,
        ownerName: owner.name,
      }
    })
    .filter((row): row is ReservationRow => row !== null)

  const hasFriends = friends.length > 0
  const hasWishlists = wishlists.length > 0
  const hasReservations = reservationRows.length > 0

  // State A: nothing to show
  if (!hasFriends && !hasWishlists && !hasReservations) {
    return (
      <main className="px-4 pb-10 pt-4">
        <h1 className="text-xl font-semibold">Главная</h1>
        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <p className="text-base font-medium text-gray-800">Пока здесь пусто</p>
          <p className="max-w-xs text-sm text-gray-500">
            Создайте вишлист или пригласите друзей — здесь появятся их желания.
          </p>
          <div className="mt-2 flex w-full max-w-xs flex-col gap-3">
            <Link
              href="/wishlists"
              className="rounded-xl bg-gray-900 py-3 text-center text-sm font-medium text-white"
            >
              Создать вишлист
            </Link>
            <Link
              href="/friends"
              className="rounded-xl border border-gray-300 py-3 text-center text-sm font-medium text-gray-700"
            >
              Пригласить друга
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="px-4 pb-10 pt-8">
      <h1 className="text-xl font-semibold">Главная</h1>

      <div className="mt-6 flex flex-col gap-10">

        {/* 1. Друзья — compact text rows */}
        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">Друзья</h2>
          {hasFriends ? (
            <ul className="flex flex-col">
              {friends.map((friend) => (
                <li key={friend.id}>
                  <Link
                    href={`/friends/${friend.id}`}
                    className="flex items-center gap-0.5 py-1"
                  >
                    <span className="text-sm text-gray-900">
                      {friend.name} {friend.surname}
                    </span>
                    <span className="text-sm text-gray-400">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm text-gray-500">У вас пока нет друзей</p>
              <Link href="/friends" className="text-sm text-gray-700 underline">
                Пригласить друга
              </Link>
            </div>
          )}
        </section>

        {/* 2. Мои вишлисты — larger card style */}
        {hasWishlists && (
          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">Мои вишлисты</h2>
            <ul className="flex flex-col gap-2">
              {wishlists.map((w) => (
                <li key={w.id}>
                  <Link
                    href={`/wishlists/${w.id}`}
                    className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3"
                  >
                    <p className="text-sm font-medium text-gray-900">{w.title}</p>
                    <span className="text-gray-400">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* State C: has friends but no wishlists */}
        {hasFriends && !hasWishlists && (
          <Link
            href="/wishlists"
            className="rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700"
          >
            Создать первый вишлист
          </Link>
        )}

        {/* 3. Я подарю — compact text rows */}
        {hasReservations && (
          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-900">Я подарю</h2>
            <ul className="flex flex-col">
              {reservationRows.map((row) => (
                <li key={row.reservationId}>
                  <Link
                    href={`/wishlists/${row.wishlistId}?fromFriend=${row.ownerId}`}
                    className="flex min-w-0 items-center gap-0.5 py-1"
                  >
                    <span className="truncate text-sm text-gray-900">
                      {row.itemTitle} — {row.ownerName}
                    </span>
                    <span className="shrink-0 text-sm text-gray-400">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

      </div>
    </main>
  )
}
