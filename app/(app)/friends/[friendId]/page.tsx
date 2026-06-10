import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { RemoveFriendSection } from '@/features/friends/remove-friend-section'
import { FriendPeopleSection } from '@/features/friends/friend-people-section'

type Wishlist = {
  id: string
  title: string
  created_at: string
}

type PersonRow = {
  id: string
  name: string
  surname: string
  avatar_url: string | null
  username: string
}

export default async function FriendProfilePage({
  params,
}: {
  params: Promise<{ friendId: string }>
}) {
  const { friendId } = await params

  const supabase = await createServerSupabaseClient()

  // Round 1: profile + auth + friendship guard — all parallel
  const [
    { data: profile },
    { data: { user } },
    { data: friendshipRows },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name, surname, avatar_url, friends_list_visibility')
      .eq('id', friendId)
      .single(),
    supabase.auth.getUser(),
    // RLS scopes this to user_id = auth.uid(); eq('friend_id') checks the specific friendship.
    supabase
      .from('friendships')
      .select('friend_id')
      .eq('friend_id', friendId),
  ])

  if (!user) redirect('/login')
  if (!profile) notFound()
  // Page is only accessible to confirmed friends of this user.
  if (!friendshipRows?.length) notFound()

  // Round 2: all content queries — run in parallel
  const [
    wishlistsResult,
    mutualFriendsResult,
    friendsOfFriendResult,
    outgoingRequestsResult,
    incomingRequestsResult,
  ] = await Promise.all([
    supabase
      .from('wishlists')
      .select('id, title, created_at')
      .eq('owner_id', friendId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false }),
    supabase.rpc('get_mutual_friends', { p_friend_id: friendId }),
    supabase.rpc('get_friends_of_friend', { p_friend_id: friendId }),
    supabase
      .from('friend_requests')
      .select('id, to_user_id')
      .eq('from_user_id', user.id),
    supabase
      .from('friend_requests')
      .select('id, from_user_id')
      .eq('to_user_id', user.id),
  ])

  const wishlists = (wishlistsResult.data ?? []) as Wishlist[]
  const mutualFriends = (mutualFriendsResult.data ?? []) as PersonRow[]
  const friendsOfFriend = (friendsOfFriendResult.data ?? []) as PersonRow[]

  // Build request state maps for FriendPeopleSection initial state
  const outgoingSet = new Set(
    ((outgoingRequestsResult.data ?? []) as Array<{ id: string; to_user_id: string }>)
      .map(r => r.to_user_id)
  )
  const incomingMap: Record<string, string> = {}
  for (const r of (incomingRequestsResult.data ?? []) as Array<{ id: string; from_user_id: string }>) {
    incomingMap[r.from_user_id] = r.id
  }

  // Filter request state to only people shown in the friends-of-friend list
  const foFIds = new Set(friendsOfFriend.map(p => p.id))
  const filteredOutgoing = [...outgoingSet].filter(id => foFIds.has(id))
  const filteredIncoming: Record<string, string> = {}
  for (const [userId, reqId] of Object.entries(incomingMap)) {
    if (foFIds.has(userId)) filteredIncoming[userId] = reqId
  }

  const isHidden = profile.friends_list_visibility === 'private'

  return (
    <main className="px-4 pb-10 pt-4">
      <Link href="/friends" className="text-sm text-gray-600 dark:text-gray-400">
        ‹ Друзья
      </Link>

      <h1 className="mt-3 text-xl font-bold leading-tight">
        Вишлисты {profile.name} {profile.surname}
      </h1>

      <div className="mt-5">
        {wishlists.length === 0 ? (
          <p className="text-sm text-gray-500">Пока нет вишлистов.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {wishlists.map((w) => (
              <li key={w.id}>
                <Link
                  href={`/wishlists/${w.id}?fromFriend=${friendId}`}
                  className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-[#323234] px-4 py-3"
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{w.title}</p>
                  <span className="text-gray-400">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {mutualFriends.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 section-title">Общие друзья</h2>
          <ul className="grouped-card">
            {mutualFriends.map((p, i) => (
              <li key={p.id}>
                {i > 0 && <div className="row-divider" />}
                <Link
                  href={`/friends/${p.id}`}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                    {p.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-gray-200 dark:bg-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300">
                        {(p.name[0] + (p.surname?.[0] ?? '')).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.name} {p.surname}</p>
                    <p className="text-xs text-gray-400">@{p.username}</p>
                  </div>
                  <span className="shrink-0 text-gray-400">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-2 section-title">
          {mutualFriends.length > 0 ? 'Другие друзья' : `Друзья ${profile.name}`}
        </h2>
        <FriendPeopleSection
          friends={friendsOfFriend}
          isHidden={isHidden}
          friendName={profile.name}
          initialOutgoingIds={filteredOutgoing}
          initialIncomingMap={filteredIncoming}
        />
      </section>

      <RemoveFriendSection friendId={friendId} />
    </main>
  )
}
