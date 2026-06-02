import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { CreateInviteSection } from '@/features/friends/create-invite-section'
import { pluralRu, friendBirthdayLine } from '@/lib/format'
import { IncomingRequestsSection } from '@/features/friends/incoming-requests-section'
import type { IncomingRequest } from '@/features/friends/incoming-requests-section'
import { SearchSection } from '@/features/friends/search-section'

type FriendProfile = {
  id: string
  name: string
  surname: string
  avatar_url: string | null
  birthday: string | null
}

type SenderProfile = {
  id: string
  name: string
  surname: string
  username: string
  avatar_url: string | null
}

export default async function FriendsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const today = new Date()

  const { data: friendships } = await supabase
    .from('friendships')
    .select('friend_id')

  const friendIds = (friendships ?? []).map((f) => f.friend_id as string)

  const [friendsResult, requestsResult] = await Promise.all([
    friendIds.length > 0
      ? supabase
          .from('profiles')
          .select('id, name, surname, avatar_url, birthday')
          .in('id', friendIds)
          .order('name')
      : Promise.resolve({ data: [] as FriendProfile[] }),
    supabase
      .from('friend_requests')
      .select('id, from_user_id, to_user_id'),
  ])

  const friends = (friendsResult.data ?? []) as FriendProfile[]
  const allRequests = (requestsResult.data ?? []) as Array<{ id: string; from_user_id: string; to_user_id: string }>

  const outgoingRequests = allRequests.filter(r => r.from_user_id === user!.id)
  const incomingRequests = allRequests.filter(r => r.to_user_id === user!.id)

  // Fetch sender profiles for incoming requests (permitted by profiles RLS policy)
  let senderProfiles: SenderProfile[] = []
  const incomingSenderIds = incomingRequests.map(r => r.from_user_id)
  if (incomingSenderIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, surname, username, avatar_url')
      .in('id', incomingSenderIds)
    senderProfiles = (data ?? []) as SenderProfile[]
  }

  const senderById = new Map(senderProfiles.map(p => [p.id, p]))

  const incomingRequestsList: IncomingRequest[] = incomingRequests
    .map(r => {
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

  const outgoingUserIds = outgoingRequests.map(r => r.to_user_id)

  const incomingMapForSearch: Record<string, string> = {}
  for (const r of incomingRequests) {
    incomingMapForSearch[r.from_user_id] = r.id
  }

  // Active wishlist counts per friend
  const friendWishlistCountMap = new Map<string, number>()
  if (friendIds.length > 0) {
    const { data: counts } = await supabase
      .from('wishlists')
      .select('owner_id')
      .in('owner_id', friendIds)
      .eq('is_archived', false)
    for (const row of (counts ?? [])) {
      friendWishlistCountMap.set(row.owner_id, (friendWishlistCountMap.get(row.owner_id) ?? 0) + 1)
    }
  }

  return (
    <main className="p-4">
      <h1 className="section-title">Друзья</h1>

      <IncomingRequestsSection requests={incomingRequestsList} />

      <SearchSection
        initialFriendIds={friendIds}
        initialOutgoingIds={outgoingUserIds}
        initialIncomingMap={incomingMapForSearch}
      />

      {friends.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-2 text-center">
          <p className="text-base font-medium text-gray-800">
            У вас пока нет друзей
          </p>
          <p className="max-w-xs text-sm text-gray-500">
            Пригласите друзей — вы сможете видеть их вишлисты и координировать
            подарки.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grouped-card">
          {friends.map((friend, i) => {
            const count = friendWishlistCountMap.get(friend.id) ?? 0
            const birthday = friend.birthday ? friendBirthdayLine(friend.birthday, today) : null
            const subline = count === 0
              ? birthday
              : `${count} ${pluralRu(count, 'вишлист', 'вишлиста', 'вишлистов')}${birthday ? ` • ${birthday}` : ''}`
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
      )}

      <CreateInviteSection />
    </main>
  )
}
