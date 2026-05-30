import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { CreateInviteSection } from '@/features/friends/create-invite-section'

type FriendProfile = {
  id: string
  name: string
  surname: string
  avatar_url: string | null
}

export default async function FriendsPage() {
  const supabase = await createServerSupabaseClient()

  // RLS ensures only the current user's friendship rows are returned.
  const { data: friendships } = await supabase
    .from('friendships')
    .select('friend_id')

  const friendIds = (friendships ?? []).map((f) => f.friend_id as string)

  let friends: FriendProfile[] = []

  if (friendIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, surname, avatar_url')
      .in('id', friendIds)
      .order('name')

    friends = (data ?? []) as FriendProfile[]
  }

  return (
    <main className="p-4">
      <h1 className="text-xl font-semibold">Друзья</h1>

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
        <ul className="mt-4 flex flex-col gap-2">
          {friends.map((friend) => (
            <li key={friend.id}>
              <Link
                href={`/friends/${friend.id}`}
                className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                    {friend.name[0]}{friend.surname[0]}
                  </div>
                  <span className="text-sm font-medium">
                    {friend.name} {friend.surname}
                  </span>
                </div>
                <span className="text-gray-400">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CreateInviteSection />
    </main>
  )
}
