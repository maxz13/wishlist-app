import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { CreateWishlistSection } from '@/features/wishlists/create-wishlist-section'

type Wishlist = {
  id: string
  title: string
  created_at: string
}

export default async function WishlistsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('wishlists')
    .select('id, title, created_at')
    .eq('owner_id', user!.id)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  const wishlists = (data ?? []) as Wishlist[]

  return (
    <main className="p-4">
      <h1 className="text-xl font-semibold">Вишлисты</h1>

      {wishlists.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-2 text-center">
          <p className="text-base font-medium text-gray-800">
            Вишлистов пока нет
          </p>
          <p className="max-w-xs text-sm text-gray-500">
            Создайте первый вишлист и поделитесь им с друзьями.
          </p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
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
      )}

      <CreateWishlistSection />
    </main>
  )
}
