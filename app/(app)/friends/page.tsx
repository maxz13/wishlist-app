import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { CreateInviteSection } from '@/features/friends/create-invite-section'
import { pluralRu, friendBirthdayLine } from '@/lib/format'

type FriendProfile = {
  id: string
  name: string
  surname: string
  avatar_url: string | null
  birthday: string | null
}

export default async function FriendsPage() {
  const supabase = await createServerSupabaseClient()
  const today = new Date()

  const { data: friendships } = await supabase
    .from('friendships')
    .select('friend_id')

  const friendIds = (friendships ?? []).map((f) => f.friend_id as string)

  let friends: FriendProfile[] = []
  if (friendIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, surname, avatar_url, birthday')
      .in('id', friendIds)
      .order('name')
    friends = (data ?? []) as FriendProfile[]
  }

  let friendWishlistCountMap = new Map<string, number>()
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
        <ul className="mt-4 grouped-card">
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
