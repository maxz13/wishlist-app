import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'

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
type UpcomingBirthday = { id: string; name: string; daysUntil: number; label: string }

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
    profiles: { id: string; name: string; surname: string }
  }
}
type ActivityEvent =
  | { type: 'new_friend';   friendId: string; friendName: string; friendSurname: string; ts: string }
  | { type: 'new_wishlist'; wishlistId: string; wishlistTitle: string; friendId: string; friendName: string; ts: string }
  | { type: 'new_items';    count: number; singleTitle: string | null; wishlistId: string; wishlistTitle: string; friendId: string; friendName: string; ts: string }

// ---- helpers ----------------------------------------------------------------

function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10  = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

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

function getDaysUntilBirthday(birthdayIso: string, today: Date): number {
  const [, month, day] = birthdayIso.split('-').map(Number)
  const todayMidnight  = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const thisYear       = new Date(today.getFullYear(), month - 1, day)
  const target         = thisYear < todayMidnight
    ? new Date(today.getFullYear() + 1, month - 1, day)
    : thisYear
  return Math.round((target.getTime() - todayMidnight.getTime()) / 86_400_000)
}

function birthdayLabel(daysUntil: number): string {
  if (daysUntil === 0) return 'сегодня 🎉'
  const mod10  = daysUntil % 10
  const mod100 = daysUntil % 100
  let unit: string
  if (mod10 === 1 && mod100 !== 11)                                      unit = 'день'
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))   unit = 'дня'
  else                                                                   unit = 'дней'
  return `через ${daysUntil} ${unit}`
}

function moreItemsLabel(n: number, one: string, few: string, many: string): string {
  return `и ещё ${n} ${pluralRu(n, one, few, many)}`
}

function friendBirthdayLine(birthdayIso: string, today: Date): string {
  const daysUntil = getDaysUntilBirthday(birthdayIso, today)
  if (daysUntil === 0) return 'День рождения сегодня'
  if (daysUntil <= 10) return `День рождения через ${daysUntil} ${pluralRu(daysUntil, 'день', 'дня', 'дней')}`
  const [, month, day] = birthdayIso.split('-').map(Number)
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
  return `День рождения ${day} ${months[month - 1]}`
}

// ---- page -------------------------------------------------------------------

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today        = new Date()
  const sevenDaysAgo = new Date(today.getTime() - 7 * 86_400_000).toISOString()

  // Friendships — include created_at to derive new-friend activity events
  const { data: friendshipData } = await supabase
    .from('friendships')
    .select('friend_id, created_at')

  const friendshipRows = (friendshipData ?? []) as Friendship[]
  const friendIds      = friendshipRows.map((f) => f.friend_id)

  // Own wishlists
  const { data: wishlistsData } = await supabase
    .from('wishlists')
    .select('id, title')
    .eq('owner_id', user!.id)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  const wishlists = (wishlistsData ?? []) as Wishlist[]

  // Friend profiles — used for Friends section, Я подарю, and activity events
  let friends: Friend[] = []
  if (friendIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, surname, birthday, avatar_url')
      .in('id', friendIds)
      .order('name')
    friends = (data ?? []) as Friend[]
  }

  const profileById = new Map(friends.map((f) => [f.id, f]))

  // Activity: new wishlists and new visible items by friends, last 7 days
  const [newWishlistsResult, newItemsResult] = await Promise.all([
    friendIds.length > 0
      ? supabase
          .from('wishlists')
          .select('id, title, created_at, profiles!inner(id, name, surname)')
          .in('owner_id', friendIds)
          .eq('is_archived', false)
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as WishlistActivityRow[] }),
    supabase
      .from('wishlist_items')
      .select('id, title, created_at, wishlist_id, wishlists!inner(id, title, owner_id, profiles!inner(id, name, surname))')
      .eq('is_visible', true)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false }),
  ])

  const newWishlistsRaw = (newWishlistsResult.data ?? []) as unknown as WishlistActivityRow[]
  const newItemsRaw     = ((newItemsResult.data ?? []) as unknown as ItemActivityRow[])
    .filter((item) => item.wishlists.owner_id !== user!.id)

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
      wishlistId:    first.wishlist_id,
      wishlistTitle: first.wishlists.title,
      friendId:      first.wishlists.profiles.id,
      friendName:    first.wishlists.profiles.name,
      ts:            latestTs,
    }
  })

  const displayedEvents = [...newFriendEvents, ...newWishlistEvents, ...newItemEvents]
    .sort((a, b) => b.ts.localeCompare(a.ts))
    .slice(0, 4)

  const hasActivity = displayedEvents.length > 0

  // Upcoming birthdays — derived from friends already fetched, no extra query
  const upcomingBirthdays: UpcomingBirthday[] = friends
    .filter((f): f is Friend & { birthday: string } => f.birthday !== null)
    .map((f) => {
      const daysUntil = getDaysUntilBirthday(f.birthday, today)
      return { id: f.id, name: f.name, daysUntil, label: birthdayLabel(daysUntil) }
    })
    .filter((entry) => entry.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil)

  // My reservations
  const { data: reservationsData } = await supabase
    .from('reservations')
    .select('id, wishlist_item_id')
    .eq('reserved_by_user_id', user!.id)

  const myReservations = (reservationsData ?? []) as Array<{ id: string; wishlist_item_id: string }>

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

  const itemById          = new Map(reservedItems.map((i) => [i.id, i]))
  const itemWishlistById  = new Map(itemWishlists.map((w) => [w.id, w]))

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
  const displayedBirthdays  = upcomingBirthdays.slice(0, 3)
  const moreBirthdaysCount  = Math.max(0, upcomingBirthdays.length - 3)
  const displayedWishlists  = wishlists.slice(0, 3)
  const moreWishlistsCount  = Math.max(0, wishlists.length - 3)

  // State A: nothing to show at all
  if (!hasFriends && !hasWishlists && !hasReservations && !hasActivity) {
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
                  {'Новый вишлист '}
                  <Link href={`/wishlists/${event.wishlistId}`} className="font-medium">
                    «{event.wishlistTitle}»
                  </Link>
                  {' — '}
                  <Link href={`/friends/${event.friendId}`} className="font-medium">
                    {event.friendName}
                  </Link>
                </>)}

                {event.type === 'new_items' && event.count === 1 && (<>
                  {`«${event.singleTitle}» в `}
                  <Link href={`/wishlists/${event.wishlistId}`} className="font-medium">
                    «{event.wishlistTitle}»
                  </Link>
                  {' — '}
                  <Link href={`/friends/${event.friendId}`} className="font-medium">
                    {event.friendName}
                  </Link>
                </>)}

                {event.type === 'new_items' && event.count > 1 && (<>
                  {`${event.count} ${pluralRu(event.count, 'новое желание', 'новых желания', 'новых желаний')} в `}
                  <Link href={`/wishlists/${event.wishlistId}`} className="font-medium">
                    «{event.wishlistTitle}»
                  </Link>
                  {' — '}
                  <Link href={`/friends/${event.friendId}`} className="font-medium">
                    {event.friendName}
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
                {displayedFriends.map((friend, i) => (
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
                        {friend.birthday && (
                          <p className="text-xs text-gray-400">{friendBirthdayLine(friend.birthday, today)}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-gray-400">›</span>
                    </Link>
                  </li>
                ))}
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

        {/* 2. Дни рождения */}
        {upcomingBirthdays.length > 0 && (
          <section className="mt-8 sm:mt-10">
            <h2 className="mb-2 section-title">Дни рождения</h2>
            <ul className="flex flex-col">
              {displayedBirthdays.map((entry) => (
                <li key={entry.id}>
                  <Link
                    href={`/friends/${entry.id}`}
                    className="flex items-center gap-0.5 py-1"
                  >
                    <span className="text-sm text-gray-900">
                      {entry.name} — {entry.label}
                    </span>
                    <span className="text-sm text-gray-400">→</span>
                  </Link>
                </li>
              ))}
            </ul>
            {moreBirthdaysCount > 0 && (
              <Link href="/friends" className="block py-1 text-sm text-gray-500">
                {moreItemsLabel(moreBirthdaysCount, 'день рождения', 'дня рождения', 'дней рождения')}
              </Link>
            )}
          </section>
        )}

        {/* 3. Мои вишлисты — larger card style */}
        {hasWishlists && (
          <section className="mt-8 sm:mt-10">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="section-title">Мои вишлисты</h2>
              <Link href="/wishlists" className="flex items-center gap-1 text-sm text-gray-500">
                См. все<span>›</span>
              </Link>
            </div>
            <ul className="flex flex-col gap-2">
              {displayedWishlists.map((w) => (
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
            {moreWishlistsCount > 0 && (
              <Link href="/wishlists" className="mt-1 block py-1 text-sm text-gray-500">
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

        {/* 4. Я подарю — compact text rows */}
        {hasReservations && (
          <section className="mt-8 sm:mt-10">
            <h2 className="mb-2 section-title">Я подарю</h2>
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
