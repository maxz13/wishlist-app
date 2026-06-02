import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { CreateWishlistSection } from '@/features/wishlists/create-wishlist-section'
import { pluralRu } from '@/lib/format'

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

  const [activeResult, archivedResult] = await Promise.all([
    supabase
      .from('wishlists')
      .select('id, title, created_at')
      .eq('owner_id', user!.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false }),
    supabase
      .from('wishlists')
      .select('id, title, created_at')
      .eq('owner_id', user!.id)
      .eq('is_archived', true)
      .order('updated_at', { ascending: false }),
  ])

  const wishlists = (activeResult.data ?? []) as Wishlist[]
  const archived  = (archivedResult.data ?? []) as Wishlist[]

  const itemCountMap = new Map<string, number>()
  if (wishlists.length > 0) {
    const { data: counts } = await supabase
      .from('wishlist_items')
      .select('wishlist_id')
      .in('wishlist_id', wishlists.map(w => w.id))
    for (const row of (counts ?? [])) {
      itemCountMap.set(row.wishlist_id, (itemCountMap.get(row.wishlist_id) ?? 0) + 1)
    }
  }

  return (
    <main className="p-4">
      <h1 className="section-title">Вишлисты</h1>

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
        <ul className="mt-4 grouped-card">
          {wishlists.map((w, i) => {
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
      )}

      <CreateWishlistSection />

      {archived.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-2 text-sm font-medium text-gray-400">Архив</h2>
          <ul className="grouped-card">
            {archived.map((w, i) => (
              <li key={w.id}>
                {i > 0 && <div className="h-px bg-[#f3f4f6]" />}
                <Link
                  href={`/wishlists/${w.id}`}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  <p className="text-sm text-gray-400">{w.title}</p>
                  <span className="text-gray-300">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
