import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { pluralRu, friendBirthdayLine, getDaysUntilBirthday } from '@/lib/format'
import { FeedList } from './feed-list'
import type { ActivityEvent } from './feed-list'
import { IncomingRequestsSection } from '@/features/friends/incoming-requests-section'
import type { IncomingRequest } from '@/features/friends/incoming-requests-section'
import { IncomingFamilyRequestsSection } from '@/features/friends/incoming-family-requests-section'
import type { IncomingFamilyRequest } from '@/features/friends/incoming-family-requests-section'
import { RecommendationsSection } from '@/features/friends/recommendations-section'
import { ExpirationGuideCard } from '@/features/wishlists/expiration-guide-card'
import { CreateWishlistTrigger } from '@/features/wishlists/create-wishlist-trigger'

type Friend        = { id: string; name: string; surname: string; birthday: string | null; avatar_url: string | null }
type Friendship    = { friend_id: string; created_at: string }
type Wishlist      = { id: string; title: string; expires_on: string | null }
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
  owner_id: string
  visibility: string
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



// ---- page -------------------------------------------------------------------

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today        = new Date()
  const fourteenDaysAgo = new Date(today.getTime() - 14 * 86_400_000).toISOString()

  type SenderProfile = { id: string; name: string; surname: string; username: string; avatar_url: string | null }

  // Round 1: all queries that depend only on user.id — run in parallel
  const [
    friendshipResult,
    requestsResult,
    wishlistsResult,
    myReservationsResult,
    newItemsResult,
    newReservationsResult,
    recommendationsResult,
    autoArchivedResult,
    profileFlagsResult,
    familyRequestsResult,
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
      .select('id, title, expires_on')
      .eq('owner_id', user!.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false }),
    supabase
      .from('reservations')
      .select('id, wishlist_item_id')
      .eq('reserved_by_user_id', user!.id),
    supabase
      .from('wishlist_items')
      .select('id, title, created_at, wishlist_id, wishlists!inner(id, title, owner_id, is_archived, visibility)')
      .eq('is_visible', true)
      .gte('created_at', fourteenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('reservations')
      .select('id, created_at, reserved_by_user_id, wishlist_items!inner(id, title, wishlists!inner(id, owner_id, title, is_archived, visibility))')
      .neq('reserved_by_user_id', user!.id)
      .gte('created_at', fourteenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.rpc('get_friend_recommendations', { p_limit: 8 }),
    supabase
      .from('wishlists')
      .select('id, title, auto_archived_at')
      .eq('owner_id', user!.id)
      .not('auto_archived_at', 'is', null)
      .gte('auto_archived_at', fourteenDaysAgo)
      .order('auto_archived_at', { ascending: false })
      .limit(10),
    supabase
      .from('profiles')
      .select('wishlist_expiration_guide_completed_at')
      .eq('id', user!.id)
      .single(),
    supabase
      .from('family_requests')
      .select('id, from_user_id, to_user_id')
      .eq('to_user_id', user!.id),
  ])

  // Derive IDs from Round 1 results
  const friendshipRows = (friendshipResult.data ?? []) as Friendship[]
  const friendIds      = friendshipRows.map((f) => f.friend_id)
  const rawRequests    = (requestsResult.data ?? []) as Array<{ id: string; from_user_id: string; to_user_id: string }>
  const wishlists      = (wishlistsResult.data ?? []) as Wishlist[]
  const myReservations = (myReservationsResult.data ?? []) as Array<{ id: string; wishlist_item_id: string }>

  const profileFlags          = profileFlagsResult.data as { wishlist_expiration_guide_completed_at: string | null } | null
  const guidePending          = !profileFlags?.wishlist_expiration_guide_completed_at
  const wishlistsWithoutExpiry = wishlists.filter(w => !w.expires_on)
  const showGuideCard         = guidePending && wishlistsWithoutExpiry.length > 0
  const firstGuideWishlistId  = wishlistsWithoutExpiry[0]?.id ?? null

  type RecommendationRow = {
    id: string; name: string; surname: string
    avatar_url: string | null; username: string; mutual_count: number
  }
  const recommendations = (recommendationsResult.data ?? []) as RecommendationRow[]
  // rawRequests is incoming-only (.eq('to_user_id', user.id)), so this map is correct for initialIncomingMap.
  const recIncomingMap: Record<string, string> = {}
  for (const r of rawRequests) {
    recIncomingMap[r.from_user_id] = r.id
  }

  // Round 2: queries that depend on Round 1 IDs — run in parallel
  const [
    senderProfilesResult,
    friendProfilesResult,
    friendWishlistsResult,
    newWishlistsResult,
    reservedItemsResult,
    mutualCountsResult,
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
        .select('id, title, created_at, owner_id, visibility')
        .in('owner_id', friendIds)
        .eq('is_archived', false)
        .in('visibility', ['all_friends', 'family'])
        .gte('created_at', fourteenDaysAgo)
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
    // Mutual friend counts (depends on friendIds)
    (async () => {
      if (friendIds.length === 0) return { data: [] as Array<{ user_id: string; mutual_count: number }> }
      return supabase.rpc('get_mutual_friend_counts', { p_user_ids: friendIds })
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

  const friends    = (friendProfilesResult.data ?? []) as Friend[]
  const profileById = new Map(friends.map((f) => [f.id, f]))

  const incomingFamilyRequestsList: IncomingFamilyRequest[] = (
    (familyRequestsResult.data ?? []) as Array<{ id: string; from_user_id: string; to_user_id: string }>
  ).flatMap((r) => {
    const profile = profileById.get(r.from_user_id)
    if (!profile) return []
    return [{
      id: r.id,
      fromUserId: r.from_user_id,
      fromProfile: { name: profile.name, surname: profile.surname, avatar_url: profile.avatar_url },
    }]
  })

  const friendWishlistRows = (friendWishlistsResult.data ?? []) as Array<{ id: string; owner_id: string }>
  const wishlistIdToOwnerId = new Map(friendWishlistRows.map(w => [w.id, w.owner_id]))
  const allFriendWishlistIds = friendWishlistRows.map(w => w.id)
  const friendWishlistCountMap = new Map<string, number>()
  for (const row of friendWishlistRows) {
    friendWishlistCountMap.set(row.owner_id, (friendWishlistCountMap.get(row.owner_id) ?? 0) + 1)
  }

  const reservedItems = (reservedItemsResult.data ?? []) as Array<{ id: string; title: string; wishlist_id: string }>

  const mutualCountMap = new Map<string, number>()
  for (const row of (mutualCountsResult.data ?? []) as Array<{ user_id: string; mutual_count: number }>) {
    mutualCountMap.set(row.user_id, row.mutual_count)
  }

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
    .filter((item) => item.wishlists.owner_id !== user!.id && !item.wishlists.is_archived && (item.wishlists.visibility === 'all_friends' || item.wishlists.visibility === 'family'))

  // --- Build activity events ---

  // new_friend: friendships formed in last 7 days
  const newFriendEvents: ActivityEvent[] = friendshipRows
    .filter((f) => f.created_at >= fourteenDaysAgo)
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
  const newWishlistEvents = newWishlistsRaw.flatMap((w) => {
    const profile = profileById.get(w.owner_id)
    if (!profile) return []
    return [{
      type:          'new_wishlist' as const,
      wishlistId:    w.id,
      wishlistTitle: w.title,
      friendId:      profile.id,
      friendName:    profile.name,
      fromFamily:    w.visibility === 'family',
      ts:            w.created_at,
    }]
  })

  // new_items: group by (owner_id, wishlist_id, calendar day) to avoid spam
  // when a friend adds many items to the same wishlist in one sitting.
  // Group by (owner, wishlist) across the full rolling window — one event per wishlist
  const itemGroupMap = new Map<string, ItemActivityRow[]>()
  for (const item of newItemsRaw) {
    const key = `${item.wishlists.owner_id}__${item.wishlist_id}`
    if (!itemGroupMap.has(key)) itemGroupMap.set(key, [])
    itemGroupMap.get(key)!.push(item)
  }
  const newItemEvents = Array.from(itemGroupMap.values()).flatMap((group) => {
    const first   = group[0]
    const profile = profileById.get(first.wishlists.owner_id)
    if (!profile) return []
    const latestTs = group.reduce(
      (max, i) => (i.created_at > max ? i.created_at : max),
      group[0].created_at,
    )
    return [{
      type:          'new_items' as const,
      count:         group.length,
      singleTitle:   group.length === 1 ? first.title : null,
      wishlistId:    first.wishlist_id,
      wishlistTitle: first.wishlists.title,
      friendId:      profile.id,
      friendName:    profile.name,
      fromFamily:    first.wishlists.visibility === 'family',
      ts:            latestTs,
    }]
  })

  // wishlist_item_reserved: items owned by current user that were reserved by someone else
  const reservedItemEvents: ActivityEvent[] = ((newReservationsResult.data ?? []) as unknown as ReservedActivityRow[])
    .filter((r) => r.wishlist_items.wishlists.owner_id === user!.id && !r.wishlist_items.wishlists.is_archived)
    .map((r) => ({
      type:          'wishlist_item_reserved' as const,
      itemId:        r.wishlist_items.id,
      itemTitle:     r.wishlist_items.title,
      wishlistId:    r.wishlist_items.wishlists.id,
      wishlistTitle: r.wishlist_items.wishlists.title,
      label:         reservedLabel(r.id),
      ts:            r.created_at,
    }))

  // birthday_approaching: friends with birthdays 1–14 days away, most urgent first
  // Synthetic ts places these at the top of the feed; urgency determines relative order.
  const birthdayEvents: ActivityEvent[] = friends
    .filter(f => f.birthday != null)
    .flatMap(f => {
      const daysUntil = getDaysUntilBirthday(f.birthday!, today)
      if (daysUntil < 1 || daysUntil > 14) return []
      return [{
        type:      'birthday_approaching' as const,
        friendId:  f.id,
        friendName: f.name,
        daysUntil,
        ts: new Date(today.getTime() - (daysUntil - 1) * 86_400_000).toISOString(),
      }]
    })

  // wishlist_auto_archived: own wishlists archived by cron in last 7 days
  const autoArchivedEvents: ActivityEvent[] = ((autoArchivedResult.data ?? []) as Array<{ id: string; title: string; auto_archived_at: string }>)
    .map((w) => ({
      type:          'wishlist_auto_archived' as const,
      wishlistId:    w.id,
      wishlistTitle: w.title,
      ts:            w.auto_archived_at,
    }))

  // Merge new_wishlist + new_items for the same wishlistId into one event
  const itemEventByWishlistId = new Map(newItemEvents.map(e => [e.wishlistId, e]))
  const mergedWishlistEvents: ActivityEvent[] = []
  const consumedWishlistIds = new Set<string>()
  for (const w of newWishlistEvents) {
    const itemEvent = itemEventByWishlistId.get(w.wishlistId)
    if (itemEvent) {
      consumedWishlistIds.add(w.wishlistId)
      mergedWishlistEvents.push({
        type:          'new_wishlist_with_items' as const,
        wishlistId:    w.wishlistId,
        wishlistTitle: w.wishlistTitle,
        friendId:      w.friendId,
        friendName:    w.friendName,
        count:         itemEvent.count,
        fromFamily:    w.fromFamily,
        ts:            w.ts,
      })
    } else {
      mergedWishlistEvents.push(w)
    }
  }
  const remainingItemEvents = newItemEvents.filter(e => !consumedWishlistIds.has(e.wishlistId))

  const displayedEvents = [
    ...birthdayEvents, ...newFriendEvents, ...mergedWishlistEvents, ...remainingItemEvents,
    ...reservedItemEvents, ...autoArchivedEvents,
  ]
    .sort((a, b) => b.ts.localeCompare(a.ts))
    .slice(0, 20)

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

  // Stable daily friend selection: birthday urgency → recently added → deterministic rotation
  const dayIndex = Math.floor(Date.now() / 86_400_000)
  const friendCreatedAtMap = new Map(friendshipRows.map(r => [r.friend_id, r.created_at]))

  const birthdayPriorityFriends = friends
    .filter(f => f.birthday != null)
    .map(f => ({ f, daysUntil: getDaysUntilBirthday(f.birthday!, today) }))
    .filter(({ daysUntil }) => daysUntil >= 1 && daysUntil <= 14)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .map(({ f }) => f)

  const recentlyAddedFriends = friends
    .filter(f => (friendCreatedAtMap.get(f.id) ?? '') >= fourteenDaysAgo)
    .sort((a, b) => (friendCreatedAtMap.get(b.id) ?? '').localeCompare(friendCreatedAtMap.get(a.id) ?? ''))

  const selectedFriends: typeof friends = []
  const usedFriendIds = new Set<string>()
  for (const f of [...birthdayPriorityFriends, ...recentlyAddedFriends]) {
    if (selectedFriends.length >= 3) break
    if (!usedFriendIds.has(f.id)) { selectedFriends.push(f); usedFriendIds.add(f.id) }
  }
  if (selectedFriends.length < 3) {
    const pool = friends.filter(f => !usedFriendIds.has(f.id))
    if (pool.length > 0) {
      const start = dayIndex % pool.length
      for (let i = 0; i < pool.length && selectedFriends.length < 3; i++) {
        selectedFriends.push(pool[(start + i) % pool.length])
      }
    }
  }

  // State A: nothing to show at all
  if (!hasFriends && !hasWishlists && !hasReservations && !hasActivity && incomingRequestsList.length === 0 && incomingFamilyRequestsList.length === 0) {
    return (
      <main className="px-4 pb-10 pt-4">
        <h1 className="section-title">Лента</h1>
        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <p className="text-base font-medium text-gray-800 dark:text-gray-200">Пока здесь пусто</p>
          <p className="max-w-xs text-sm text-gray-500">
            Создайте вишлист или пригласите друзей — здесь появятся их желания.
          </p>
          <div className="mt-2 flex w-full max-w-xs flex-col gap-3">
            <CreateWishlistTrigger className="rounded-xl bg-gray-900 dark:bg-white py-3 text-center text-sm font-medium text-white dark:text-gray-900">
              Создать вишлист
            </CreateWishlistTrigger>
            <Link
              href="/friends"
              className="rounded-xl border border-gray-300 dark:border-[#323234] py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300"
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
      <IncomingFamilyRequestsSection requests={incomingFamilyRequestsList} />

      {showGuideCard && firstGuideWishlistId != null && (
        <ExpirationGuideCard firstWishlistId={firstGuideWishlistId} />
      )}

      {/* Activity feed — directly under page title, no redundant section heading */}
      {hasActivity && <FeedList events={displayedEvents} />}

      <div className={`flex flex-col${hasActivity ? ' mt-8 sm:mt-10' : ' mt-4'}`}>

        {/* 1. Рекомендации или Друзья */}
        {recommendations.length > 0 ? (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="section-title">Возможно, вы знакомы</h2>
              <Link href="/friends" className="flex items-center gap-1 text-sm text-gray-500">
                Все рекомендации<span>›</span>
              </Link>
            </div>
            <RecommendationsSection
              recommendations={recommendations.slice(0, 3)}
              initialOutgoingIds={[]}
              initialIncomingMap={recIncomingMap}
            />
          </section>
        ) : (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="section-title">Друзья</h2>
              {hasFriends && (
                <Link href="/friends" className="flex items-center gap-1 text-sm text-gray-500">
                  Все {friends.length} {pluralRu(friends.length, 'друг', 'друга', 'друзей')}<span>›</span>
                </Link>
              )}
            </div>
            {hasFriends ? (
              <ul className="grouped-card">
                  {selectedFriends.map((friend, i) => {
                    const count = friendWishlistCountMap.get(friend.id) ?? 0
                    const itemCount = friendItemCountMap.get(friend.id) ?? 0
                    const mutualCount = mutualCountMap.get(friend.id) ?? 0
                    const birthday = friend.birthday ? friendBirthdayLine(friend.birthday, today) : null
                    const parts: string[] = []
                    if (mutualCount > 0) parts.push(`${mutualCount} ${pluralRu(mutualCount, 'общий друг', 'общих друга', 'общих друзей')}`)
                    if (count > 0)       parts.push(`${count} ${pluralRu(count, 'вишлист', 'вишлиста', 'вишлистов')}`)
                    if (itemCount > 0)   parts.push(`${itemCount} ${pluralRu(itemCount, 'желание', 'желания', 'желаний')}`)
                    const subline = parts.length > 0 ? parts.join(' • ') : null
                    return (
                      <li key={friend.id}>
                        {i > 0 && <div className="row-divider" />}
                        <Link
                          href={`/friends/${friend.id}`}
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl">
                            {friend.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={friend.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center bg-gray-200 dark:bg-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300">
                                {(friend.name[0] + (friend.surname?.[0] ?? '')).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{friend.name} {friend.surname}</p>
                            {subline && <p className="text-xs text-gray-400">{subline}</p>}
                            {birthday && <p className="text-xs text-gray-400">{birthday}</p>}
                          </div>
                          <span className="shrink-0 text-gray-400">›</span>
                        </Link>
                      </li>
                    )
                  })}
              </ul>
            ) : (
              <div className="flex flex-col gap-1.5">
                <p className="text-sm text-gray-500">У вас пока нет друзей</p>
                <Link href="/friends" className="text-sm text-gray-700 dark:text-gray-300 underline">
                  Пригласить друга
                </Link>
              </div>
            )}
          </section>
        )}

        {/* State C: has friends but no wishlists */}
        {hasFriends && !hasWishlists && (
          <CreateWishlistTrigger className="mt-8 rounded-xl border border-gray-300 dark:border-[#323234] px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300 sm:mt-10">
            Создать первый вишлист
          </CreateWishlistTrigger>
        )}

        {/* 3. Я подарю */}
        {hasReservations && (
          <section className="mt-8 sm:mt-10">
            <h2 className="mb-2 section-title">Я подарю</h2>
            <ul className="grouped-card">
              {reservationRows.map((row, i) => (
                <li key={row.reservationId}>
                  {i > 0 && <div className="row-divider" />}
                  <Link
                    href={`/wishlists/${row.wishlistId}?fromFriend=${row.ownerId}`}
                    className="flex min-w-0 items-center justify-between px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
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
