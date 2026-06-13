import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { CreateInviteSection } from '@/features/friends/create-invite-section'
import { pluralRu, friendBirthdayLine } from '@/lib/format'
import { IncomingRequestsSection } from '@/features/friends/incoming-requests-section'
import type { IncomingRequest } from '@/features/friends/incoming-requests-section'
import { IncomingFamilyRequestsSection } from '@/features/friends/incoming-family-requests-section'
import type { IncomingFamilyRequest } from '@/features/friends/incoming-family-requests-section'
import { SearchSection } from '@/features/friends/search-section'
import { RecommendationsSection } from '@/features/friends/recommendations-section'
import { FriendsTabSection } from '@/features/friends/friends-tab-section'
import type { FriendRow } from '@/features/friends/friends-tab-section'

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
  if (!user) redirect('/login')
  const today = new Date()

  const { data: friendships } = await supabase
    .from('friendships')
    .select('friend_id')

  const friendIds = (friendships ?? []).map((f) => f.friend_id as string)

  const [friendsResult, requestsResult, recommendationsResult, familyResult, familyRequestsResult] = await Promise.all([
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
    supabase.rpc('get_friend_recommendations', { p_limit: 8 }),
    supabase.from('family_members').select('family_user_id'),
    supabase
      .from('family_requests')
      .select('id, from_user_id, to_user_id'),
  ])

  const friends = (friendsResult.data ?? []) as FriendProfile[]
  const familyMemberIds = (familyResult.data ?? []).map(r => (r as { family_user_id: string }).family_user_id)
  const allRequests = (requestsResult.data ?? []) as Array<{ id: string; from_user_id: string; to_user_id: string }>

  const friendProfileById = new Map(friends.map(f => [f.id, f]))

  const allFamilyRequests = (familyRequestsResult.data ?? []) as Array<{ id: string; from_user_id: string; to_user_id: string }>
  const incomingFamilyRequests = allFamilyRequests.filter(r => r.to_user_id === user!.id)
  const outgoingFamilyRequests = allFamilyRequests.filter(r => r.from_user_id === user!.id)
  const pendingOutgoingFamilyIds = outgoingFamilyRequests.map(r => r.to_user_id)
  const pendingIncomingFamilyIds = incomingFamilyRequests.map(r => r.from_user_id)

  const incomingFamilyRequestsList: IncomingFamilyRequest[] = incomingFamilyRequests.flatMap((r) => {
    const profile = friendProfileById.get(r.from_user_id)
    if (!profile) return []
    return [{
      id: r.id,
      fromUserId: r.from_user_id,
      fromProfile: { name: profile.name, surname: profile.surname, avatar_url: profile.avatar_url },
    }]
  })

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

  type RecommendationRow = {
    id: string; name: string; surname: string
    avatar_url: string | null; username: string; mutual_count: number
  }
  const recommendations = (recommendationsResult.data ?? []) as RecommendationRow[]

  // Wishlist counts, item counts, and mutual friend counts per friend
  const friendWishlistCountMap = new Map<string, number>()
  const friendItemCountMap = new Map<string, number>()
  const mutualCountMap = new Map<string, number>()
  if (friendIds.length > 0) {
    const [{ data: wishlistRows }, { data: mutualRows }] = await Promise.all([
      supabase
        .from('wishlists')
        .select('id, owner_id')
        .in('owner_id', friendIds)
        .eq('is_archived', false),
      supabase.rpc('get_mutual_friend_counts', { p_user_ids: friendIds }),
    ])
    const rows = (wishlistRows ?? []) as Array<{ id: string; owner_id: string }>
    for (const row of rows) {
      friendWishlistCountMap.set(row.owner_id, (friendWishlistCountMap.get(row.owner_id) ?? 0) + 1)
    }
    for (const row of (mutualRows ?? []) as Array<{ user_id: string; mutual_count: number }>) {
      mutualCountMap.set(row.user_id, row.mutual_count)
    }
    const allWishlistIds = rows.map(w => w.id)
    if (allWishlistIds.length > 0) {
      const wishlistIdToOwner = new Map(rows.map(w => [w.id, w.owner_id]))
      const { data: itemRows } = await supabase
        .from('wishlist_items')
        .select('wishlist_id')
        .in('wishlist_id', allWishlistIds)
        .eq('is_visible', true)
      for (const row of (itemRows ?? []) as Array<{ wishlist_id: string }>) {
        const ownerId = wishlistIdToOwner.get(row.wishlist_id)
        if (ownerId) friendItemCountMap.set(ownerId, (friendItemCountMap.get(ownerId) ?? 0) + 1)
      }
    }
  }

  const friendRows: FriendRow[] = friends.map(friend => {
    const count = friendWishlistCountMap.get(friend.id) ?? 0
    const itemCount = friendItemCountMap.get(friend.id) ?? 0
    const mutualCount = mutualCountMap.get(friend.id) ?? 0
    const birthdayLine = friend.birthday ? friendBirthdayLine(friend.birthday, today) : null
    const parts: string[] = []
    if (mutualCount > 0) parts.push(`${mutualCount} ${pluralRu(mutualCount, 'общий друг', 'общих друга', 'общих друзей')}`)
    if (count > 0)       parts.push(`${count} ${pluralRu(count, 'вишлист', 'вишлиста', 'вишлистов')}`)
    if (itemCount > 0)   parts.push(`${itemCount} ${pluralRu(itemCount, 'желание', 'желания', 'желаний')}`)
    return {
      id: friend.id,
      name: friend.name,
      surname: friend.surname,
      avatar_url: friend.avatar_url,
      subline: parts.length > 0 ? parts.join(' • ') : null,
      birthdayLine,
    }
  })

  return (
    <main className="p-4">
      <IncomingRequestsSection requests={incomingRequestsList} />
      <IncomingFamilyRequestsSection requests={incomingFamilyRequestsList} />

      <SearchSection
        initialFriendIds={friendIds}
        initialOutgoingIds={outgoingUserIds}
        initialIncomingMap={incomingMapForSearch}
      />

      <CreateInviteSection />

      <FriendsTabSection
        friends={friendRows}
        familyMemberIds={familyMemberIds}
        pendingOutgoingFamilyIds={pendingOutgoingFamilyIds}
        pendingIncomingFamilyIds={pendingIncomingFamilyIds}
      />

      {recommendations.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 section-title">Возможно, вы знакомы</h2>
          <RecommendationsSection
            recommendations={recommendations}
            initialOutgoingIds={[]}
            initialIncomingMap={incomingMapForSearch}
          />
        </section>
      )}
    </main>
  )
}
