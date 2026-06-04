import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { pluralRu, friendBirthdayLine } from '@/lib/format'
import { IncomingRequestsSection } from '@/features/friends/incoming-requests-section'
import type { IncomingRequest } from '@/features/friends/incoming-requests-section'

type Friend        = { id: string; name: string; surname: string; birthday: string | null; avatar_url: string | null }
type Friendship    = { friend_id: string; created_at: string }
type Wishlist      = { id: string; title: string }
type ReservationRow = {
  reservationId: string
  itemTitle: string
  wishlistId: string
  ownerId: string
  ownerName: string
}

type WishlistActivityRow = {
  id: string
  title: string
  created_at: string
  profiles: { id: string; name: string; surname: string }
}
type ItemActivityRow = {
  id: string
  title: string
  created_at: string
  wishlist_id: string
  wishlists: {
    id: string
    title: string
    owner_id: string
    is_archived: boolean
    visibility: string
    profiles: { id: string; name: string; surname: string }
  }
}
type ReservedActivityRow = {
  id: string
  created_at: string
  reserved_by_user_id: string
  wishlist_items: {
    id: string
    title: string
    wishlists: { id: string; owner_id: string; title: string; is_archived: boolean; visibility: string }
  }
}
type AccessGrantedRow = {
  created_at: string
  wishlists: {
    id: string
    title: string
    owner_id: string
    is_archived: boolean
    profiles: { id: string; name: string; surname: string }
  }
}

type ActivityEvent =
  | { type: 'new_friend';               friendId: string; friendName: string; friendSurname: string; ts: string }
  | { type: 'new_wishlist';             wishlistId: string; wishlistTitle: string; friendId: string; friendName: string; ts: string }
  | { type: 'new_items';                count: number; singleTitle: string | null; titles: string[]; wishlistId: string; wishlistTitle: string; friendId: string; friendName: string; ts: string }
  | { type: 'wishlist_item_reserved';   itemId: string; itemTitle: string; wishlistId: string; wishlistTitle: string; label: string; ts: string }
  | { type: 'wishlist_access_granted';  wishlistId: string; wishlistTitle: string; ownerId: string; ownerName: string; ts: string }

const RESERVED_LABELS = [
  'Кто-то планирует подарить',
  'Одно из ваших желаний зарезервировали',
  'Кто-то присмотрел это желание',
  'Это желание уже у кого-то на примете',
] as const

function reservedLabel(id: string): string {
  const sum = id.replace(/-/g, '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return RESERVED_LABELS[sum % RESERVED_LABELS.length]
}

// ---- helpers ----------------------------------------------------------------


function relativeTime(isoString: string): string {
  const diff  = Date.now() - new Date(isoString).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)   return 'только что'
  if (mins  < 60)  return `${mins} мин`
  if (hours < 24)  return `${hours} ч`
  if (days  === 1) return 'вчера'
  return `${days} ${pluralRu(days, 'день', 'дня', 'дней')}`
}

function moreItemsLabel(n: number, one: string, few: string, many: string): string {
  return `и ещё ${n} ${pluralRu(n, one, few, many)}`
}

// ---- page -------------------------------------------------------------------

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today        = new Date()
  const sevenDaysAgo = new Date(today.getTime() - 7 * 86_400_000).toISOString()

  type SenderProfile = { id: string; name: string; surname: string; username: string; avatar_url: string | null }

  // Round 1: all queries that depend only on user.id — run in parallel
  const [
    friendshipResult,
    requestsResult,
    wishlistsResult,
    myReservationsResult,
    newItemsResult,
    newReservationsResult,
    accessGrantedResult,
  ] = await Promise.all([
    supabase
      .from('friendships')
      .select('friend_id, created_at'),
    supabase
      .from('friend_requests')
      .select('id, from_user_id, to_user_id')
      .eq('to_user_id', user!.id),
    supabase
      .from('wishlists')
      .select('id, title')
      .eq('owner_id', user!.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false }),
    supabase
      .from('reservations')
      .select('id, wishlist_item_id')
      .eq('reserved_by_user_id', user!.id),
    supabase
      .from('wishlist_items')
      .select('id, title, created_at, wishlist_id, wishlists!inner(id, title, owner_id, is_archived, visibility, profiles!inner(id, name, surname))')
      .eq('is_visible', true)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('reservations')
      .select('id, created_at, reserved_by_user_id, wishlist_items!inner(id, title, wishlists!inner(id, owner_id, title, is_archived, visibility))')
      .neq('reserved_by_user_id', user!.id)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('wishlist_access')
      .select('created_at, wishlists!inner(id, title, owner_id, is_archived, profiles!inner(id, name, surname))')
      .eq('user_id', user!.id)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  // Derive IDs from Round 1 results
  const friendshipRows = (friendshipResult.data ?? []) as Friendship[]
  const friendIds      = friendshipRows.map((f) => f.friend_id)
  const rawRequests    = (requestsResult.data ?? []) as Array<{ id: string; from_user_id: string; to_user_id: string }>
  const wishlists      = (wishlistsResult.data ?? []) as Wishlist[]
  const myReservations = (myReservationsResult.data ?? []) as Array<{ id: string; wishlist_item_id: string }>

  // Round 2: queries that depend on Round 1 IDs — run in parallel
  const [
    senderProfilesResult,
    itemCountsResult,
    friendProfilesResult,
    friendWishlistsResult,
    newWishlistsResult,
    reservedItemsResult,
  ] = await Promise.all([
    // Sender profiles for incoming request cards (depends on rawRequests)
    (async () => {
      if (rawRequests.length === 0) return { data: [] as SenderProfile[] }
      const senderIds = rawRequests.map((r) => r.from_user_id)
      return supabase
        .from('profiles')
        .select('id, name, surname, username, avatar_url')
        .in('id', senderIds)
    })(),
    // Own wishlist item counts (depends on wishlists)
    (async () => {
      if (wishlists.length === 0) return { data: [] as Array<{ wishlist_id: string }> }
      return supabase
        .from('wishlist_items')
        .select('wishlist_id')
        .in('wishlist_id', wishlists.map(w => w.id))
    })(),
    // Friend profiles (depends on friendIds)
    (async () => {
      if (friendIds.length === 0) return { data: [] as Friend[] }
      return supabase
        .from('profiles')
        .select('id, name, surname, birthday, avatar_url')
        .in('id', friendIds)
        .order('name')
    })(),
    // Friend wishlist counts + IDs (depends on friendIds)
    (async () => {
      if (friendIds.length === 0) return { data: [] as Array<{ id: string; owner_id: string }> }
      return supabase
        .from('wishlists')
        .select('id, owner_id')
        .in('owner_id', friendIds)
        .eq('is_archived', false)
    })(),
    // Activity: new_wishlist (depends on friendIds)
    (async () => {
      if (friendIds.length === 0) return { data: [] as WishlistActivityRow[] }
      return supabase
        .from('wishlists')
        .select('id, title, created_at, profiles!inner(id, name, surname)')
        .in('owner_id', friendIds)
        .eq('is_archived', false)
        .eq('visibility', 'all_friends')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(50)
    })(),
    // "Я подарю" reserved items (depends on myReservations)
    (async () => {
      if (myReservations.length === 0) return { data: [] as Array<{ id: string; title: string; wishlist_id: string }> }
      const reservedItemIds = myReservations.map((r) => r.wishlist_item_id)
      return supabase
        .from('wishlist_items')
        .select('id, title, wishlist_id')
        .in('id', reservedItemIds)
    })(),
  ])

  // Process Round 2 results
  const senderById = new Map(
    ((senderProfilesResult.data ?? []) as SenderProfile[]).map((p) => [p.id, p])
  )
  const incomingRequestsList: IncomingRequest[] = rawRequests
    .map((r) => {
      const profile = senderById.get(r.from_user_id)
      if (!profile) return null
      return {
        id: r.id,
        fromUserId: r.from_user_id,
        fromProfile: {
          name: profile.name,
          surname: profile.surname,
          username: profile.username,
          avatar_url: profile.avatar_url,
        },
      }
    })
    .filter((r): r is IncomingRequest => r !== null)

  const itemCountMap = new Map<string, number>()
  for (const row of (itemCountsResult.data ?? [])) {
    itemCountMap.set(row.wishlist_id, (itemCountMap.get(row.wishlist_id) ?? 0) + 1)
  }

  const friends    = (friendProfilesResult.data ?? []) as Friend[]
  const profileById = new Map(friends.map((f) => [f.id, f]))

  const friendWishlistRows = (friendWishlistsResult.data ?? []) as Array<{ id: string; owner_id: string }>
  const wishlistIdToOwnerId = new Map(friendWishlistRows.map(w => [w.id, w.owner_id]))
  const allFriendWishlistIds = friendWishlistRows.map(w => w.id)
  const friendWishlistCountMap = new Map<string, number>()
  for (const row of friendWishlistRows) {
    friendWishlistCountMap.set(row.owner_id, (friendWishlistCountMap.get(row.owner_id) ?? 0) + 1)
  }

  const reservedItems = (reservedItemsResult.data ?? []) as Array<{ id: string; title: string; wishlist_id: string }>

  // Round 3: run in parallel — "Я подарю" wishlists + friend item counts
  const [itemWishlistsResult, friendItemCountsResult] = await Promise.all([
    (async () => {
      if (reservedItems.length === 0) return { data: [] as Array<{ id: string; owner_id: string }> }
      const itemWishlistIds = [...new Set(reservedItems.map((i) => i.wishlist_id))]
      return supabase
        .from('wishlists')
        .select('id, owner_id')
        .in('id', itemWishlistIds)
        .eq('is_archived', false)
    })(),
    (async () => {
      if (allFriendWishlistIds.length === 0) return { data: [] as Array<{ wishlist_id: string }> }
      return supabase
        .from('wishlist_items')
        .select('wishlist_id')
        .in('wishlist_id', allFriendWishlistIds)
        .eq('is_visible', true)
    })(),
  ])

  const itemWishlists = (itemWishlistsResult.data ?? []) as Array<{ id: string; owner_id: string }>
  const friendItemCountMap = new Map<string, number>()
  for (const row of (friendItemCountsResult.data ?? []) as Array<{ wishlist_id: string }>) {
    const ownerId = wishlistIdToOwnerId.get(row.wishlist_id)
    if (ownerId) friendItemCountMap.set(ownerId, (friendItemCountMap.get(ownerId) ?? 0) + 1)
  }

  const newWishlistsRaw = (newWishlistsResult.data ?? []) as unknown as WishlistActivityRow[]
  const newItemsRaw     = ((newItemsResult.data ?? []) as unknown as ItemActivityRow[])
    .filter((item) => item.wishlists.owner_id !== user!.id && !item.wishlists.is_archived && item.wishlists.visibility === 'all_friends')

  // --- Build activity events ---

  // new_friend: friendships formed in last 7 days
  const newFriendEvents: ActivityEvent[] = friendshipRows
    .filter((f) => f.created_at >= sevenDaysAgo)
    .flatMap((f) => {
      const profile = profileById.get(f.friend_id)
      if (!profile) return []
      return [{
        type: 'new_friend' as const,
        friendId:      f.friend_id,
        friendName:    profile.name,
        friendSurname: profile.surname,
        ts:            f.created_at,
      }]
    })

  // new_wishlist: one event per wishlist created by a friend
  const newWishlistEvents: ActivityEvent[] = newWishlistsRaw.map((w) => ({
    type:          'new_wishlist' as const,
    wishlistId:    w.id,
    wishlistTitle: w.title,
    friendId:      w.profiles.id,
    friendName:    w.profiles.name,
    ts:            w.created_at,
  }))

  // new_items: group by (owner_id, wishlist_id, calendar day) to avoid spam
  // when a friend adds many items to the same wishlist in one sitting.
  const itemGroupMap = new Map<string, ItemActivityRow[]>()
  for (const item of newItemsRaw) {
    const day = new Date(item.created_at).toDateString()
    const key = `${item.wishlists.owner_id}__${item.wishlist_id}__${day}`
    if (!itemGroupMap.has(key)) itemGroupMap.set(key, [])
    itemGroupMap.get(key)!.push(item)
  }
  const newItemEvents: ActivityEvent[] = Array.from(itemGroupMap.values()).map((group) => {
    const first    = group[0]
    const latestTs = group.reduce(
      (max, i) => (i.created_at > max ? i.created_at : max),
      group[0].created_at,
    )
    return {
      type:          'new_items' as const,
      count:         group.length,
      singleTitle:   group.length === 1 ? first.title : null,
      titles:        group.map(i => i.title),
      wishlistId:    first.wishlist_id,
      wishlistTitle: first.wishlists.title,
      friendId:      first.wishlists.profiles.id,
      friendName:    first.wishlists.profiles.name,
      ts:            latestTs,
    }
  })

  // wishlist_item_reserved: items owned by current user that were reserved by someone else
  const reservedItemEvents: ActivityEvent[] = ((newReservationsResult.data ?? []) as unknown as ReservedActivityRow[])
    .filter((r) => r.wishlist_items.wishlists.owner_id === user!.id && !r.wishlist_items.wishlists.is_archived && r.wishlist_items.wishlists.visibility === 'all_friends')
    .map((r) => ({
      type:          'wishlist_item_reserved' as const,
      itemId:        r.wishlist_items.id,
      itemTitle:     r.wishlist_items.title,
      wishlistId:    r.wishlist_items.wishlists.id,
      wishlistTitle: r.wishlist_items.wishlists.title,
      label:         reservedLabel(r.id),
      ts:            r.created_at,
    }))

  // wishlist_access_granted: current user was added to a friend's private wishlist
  const accessGrantedEvents: ActivityEvent[] = ((accessGrantedResult.data ?? []) as unknown as AccessGrantedRow[])
    .filter((r) => r.wishlists.owner_id !== user!.id && !r.wishlists.is_archived)
    .map((r) => ({
      type:          'wishlist_access_granted' as const,
      wishlistId:    r.wishlists.id,
      wishlistTitle: r.wishlists.title,
      ownerId:       r.wishlists.owner_id,
      ownerName:     r.wishlists.profiles.name,
      ts:            r.created_at,
    }))

  const displayedEvents = [...newFriendEvents, ...newWishlistEvents, ...newItemEvents, ...reservedItemEvents]
    .sort((a, b) => b.ts.localeCompare(a.ts))
    .slice(0, 4)

  const hasActivity = displayedEvents.length > 0

  const itemById         = new Map(reservedItems.map((i) => [i.id, i]))
  const itemWishlistById = new Map(itemWishlists.map((w) => [w.id, w]))

  // Compose Я подарю rows — skip items that are drafted/archived/deleted
  const reservationRows = myReservations
    .map((r): ReservationRow | null => {
      const item    = itemById.get(r.wishlist_item_id)
      if (!item) return null
      const wishlist = itemWishlistById.get(item.wishlist_id)
      if (!wishlist) return null
      const owner = profileById.get(wishlist.owner_id)
      if (!owner) return null
      return {
        reservationId: r.id,
        itemTitle:     item.title,
        wishlistId:    item.wishlist_id,
        ownerId:       wishlist.owner_id,
        ownerName:     owner.name,
      }
    })
    .filter((row): row is ReservationRow => row !== null)

  const hasFriends     = friends.length > 0
  const hasWishlists   = wishlists.length > 0
  const hasReservations = reservationRows.length > 0

  const displayedFriends    = friends.slice(0, 3)
  const moreFriendsCount    = Math.max(0, friends.length - 3)
  const displayedWishlists  = wishlists.slice(0, 3)
  const moreWishlistsCount  = Math.max(0, wishlists.length - 3)

  // State A: nothing to show at all
  if (!hasFriends && !hasWishlists && !hasReservations && !hasActivity && incomingRequestsList.length === 0) {
    return (
      <main className="px-4 pb-10 pt-4">
        <h1 className="text-xl font-semibold">Лента</h1>
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
    <main className="px-4 pb-10 pt-5">
      <h1 className="text-xl font-semibold">Лента</h1>

      <IncomingRequestsSection requests={incomingRequestsList} />

      {/* Activity feed — directly under page title, no redundant section heading */}
      {hasActivity && (
        <ul className="mt-4 grouped-card">
          {displayedEvents.map((event, i) => (
            <li key={i}>
              {i > 0 && (
                <div className="flex justify-center">
                  <div className="grouped-card-divider" />
                </div>
              )}
              <div className="flex items-start gap-3 px-4 py-3">
              <span className="mt-1 feed-bullet" />
              <p className="text-sm leading-snug text-gray-900">

                {event.type === 'new_friend' && (<>
                  <Link href={`/friends/${event.friendId}`} className="font-medium">
                    {event.friendName} {event.friendSurname}
                  </Link>
                  {' теперь в друзьях'}
                </>)}

                {event.type === 'new_wishlist' && (<>
                  <Link href={`/friends/${event.friendId}`} className="font-medium">
                    {event.friendName}
                  </Link>
                  {' создал вишлист'}<br />
                  <Link href={`/wishlists/${event.wishlistId}`} className="font-medium">
                    «{event.wishlistTitle}»
                  </Link>
                </>)}

                {event.type === 'new_items' && event.count === 1 && (<>
                  <Link href={`/friends/${event.friendId}`} className="font-medium">
                    {event.friendName}
                  </Link>
                  {' добавил желание'}<br />
                  <span className="font-medium">{event.titles[0]}</span><br />
                  {'в '}
                  <Link href={`/wishlists/${event.wishlistId}`} className="font-medium">
                    «{event.wishlistTitle}»
                  </Link>
                </>)}

                {event.type === 'new_items' && event.count > 1 && (<>
                  <Link href={`/friends/${event.friendId}`} className="font-medium">
                    {event.friendName}
                  </Link>
                  {` добавил ${event.count} ${pluralRu(event.count, 'желание', 'желания', 'желаний')}`}<br />
                  {'в '}
                  <Link href={`/wishlists/${event.wishlistId}`} className="font-medium">
                    «{event.wishlistTitle}»
                  </Link>
                  {event.titles.map((t, i) => (
                    <span key={i}><br />{'• '}{t}</span>
                  ))}
                </>)}

                {event.type === 'wishlist_item_reserved' && (<>
                  {'Кто-то выбрал подарок: '}
                  <Link href={`/wishlists/${event.wishlistId}`} className="font-medium">
                    {event.itemTitle}
                  </Link>
                  <br />
                  <span className="text-gray-400">из «{event.wishlistTitle}»</span>
                </>)}

                {event.type === 'wishlist_access_granted' && (<>
                  <Link href={`/friends/${event.ownerId}`} className="font-medium">
                    {event.ownerName}
                  </Link>
                  {' добавил вас в приватный вишлист'}<br />
                  <Link href={`/wishlists/${event.wishlistId}`} className="font-medium">
                    «{event.wishlistTitle}»
                  </Link>
                </>)}

                <span className="text-gray-400"> · {relativeTime(event.ts)}</span>
              </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className={`flex flex-col${hasActivity ? ' mt-8 sm:mt-10' : ' mt-4'}`}>

        {/* 1. Друзья */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="section-title">Друзья</h2>
            <Link href="/friends" className="flex items-center gap-1 text-sm text-gray-500">
              Все друзья<span>›</span>
            </Link>
          </div>
          {hasFriends ? (
            <>
              <ul className="grouped-card">
                {displayedFriends.map((friend, i) => {
                  const count = friendWishlistCountMap.get(friend.id) ?? 0
                  const itemCount = friendItemCountMap.get(friend.id) ?? 0
                  const birthday = friend.birthday ? friendBirthdayLine(friend.birthday, today) : null
                  const subline = count === 0
                    ? birthday
                    : `${count} ${pluralRu(count, 'вишлист', 'вишлиста', 'вишлистов')}${itemCount > 0 ? ` · ${itemCount} ${pluralRu(itemCount, 'желание', 'желания', 'желаний')}` : ''}${birthday ? ` • ${birthday}` : ''}`
                  return (
                    <li key={friend.id}>
                      {i > 0 && <div className="ml-[68px] h-px bg-[#f3f4f6]" />}
                      <Link
                        href={`/friends/${friend.id}`}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                          {friend.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={friend.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center bg-gray-200 text-sm font-semibold text-gray-600">
                              {(friend.name[0] + (friend.surname?.[0] ?? '')).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">{friend.name} {friend.surname}</p>
                          {subline && <p className="text-xs text-gray-400">{subline}</p>}
                        </div>
                        <span className="shrink-0 text-gray-400">›</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
              {moreFriendsCount > 0 && (
                <Link href="/friends" className="mt-2 block py-1 text-sm text-gray-500">
                  {moreItemsLabel(moreFriendsCount, 'друг', 'друга', 'друзей')}
                </Link>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm text-gray-500">У вас пока нет друзей</p>
              <Link href="/friends" className="text-sm text-gray-700 underline">
                Пригласить друга
              </Link>
            </div>
          )}
        </section>

        {/* 2. Мои вишлисты */}
        {hasWishlists && (
          <section className="mt-8 sm:mt-10">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="section-title">Мои вишлисты</h2>
              <Link href="/wishlists" className="flex items-center gap-1 text-sm text-gray-500">
                См. все<span>›</span>
              </Link>
            </div>
            <ul className="grouped-card">
              {displayedWishlists.map((w, i) => {
                const count = itemCountMap.get(w.id) ?? 0
                return (
                  <li key={w.id}>
                    {i > 0 && <div className="h-px bg-[#f3f4f6]" />}
                    <Link
                      href={`/wishlists/${w.id}`}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{w.title}</p>
                        <p className="text-xs text-gray-400">
                          {count} {pluralRu(count, 'желание', 'желания', 'желаний')}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 text-gray-400">
                        <span className="text-xs">{count}</span>
                        <span>›</span>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
            {moreWishlistsCount > 0 && (
              <Link href="/wishlists" className="mt-2 block py-1 text-sm text-gray-500">
                {moreItemsLabel(moreWishlistsCount, 'вишлист', 'вишлиста', 'вишлистов')}
              </Link>
            )}
          </section>
        )}

        {/* State C: has friends but no wishlists */}
        {hasFriends && !hasWishlists && (
          <Link
            href="/wishlists"
            className="mt-8 rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700 sm:mt-10"
          >
            Создать первый вишлист
          </Link>
        )}

        {/* 3. Я подарю */}
        {hasReservations && (
          <section className="mt-8 sm:mt-10">
            <h2 className="mb-2 section-title">Я подарю</h2>
            <ul className="grouped-card">
              {reservationRows.map((row, i) => (
                <li key={row.reservationId}>
                  {i > 0 && <div className="h-px bg-[#f3f4f6]" />}
                  <Link
                    href={`/wishlists/${row.wishlistId}?fromFriend=${row.ownerId}`}
                    className="flex min-w-0 items-center justify-between px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {row.itemTitle}
                      </p>
                      <p className="text-xs text-gray-400">
                        Для {row.ownerName}
                      </p>
                    </div>
                    <span className="shrink-0 text-gray-400">›</span>
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
