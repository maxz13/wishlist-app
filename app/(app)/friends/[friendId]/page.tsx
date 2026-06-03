import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type Wishlist = {
  id: string
  title: string
  created_at: string
}

export default async function FriendProfilePage({
  params,
}: {
  params: Promise<{ friendId: string }>
}) {
  const { friendId } = await params

  const supabase = await createServerSupabaseClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, surname')
    .eq('id', friendId)
    .single()

  if (!profile) notFound()

  const { data } = await supabase
    .from('wishlists')
    .select('id, title, created_at')
    .eq('owner_id', friendId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  const wishlists = (data ?? []) as Wishlist[]

  return (
    <main className="px-4 pb-10 pt-4">
      <Link href="/friends" className="text-sm text-gray-600">
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
                  className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3"
                >
                  <p className="text-sm font-medium text-gray-900">{w.title}</p>
                  <span className="text-gray-400">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
