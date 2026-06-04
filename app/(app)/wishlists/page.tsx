import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { CreateWishlistSection } from '@/features/wishlists/create-wishlist-section'
import { WishlistCard } from '@/features/wishlists/wishlist-card'
import { pluralRu } from '@/lib/format'

type Wishlist = {
  id: string
  title: string
  created_at: string
  visibility: string
}

export default async function WishlistsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [activeResult, archivedResult, sharedResult] = await Promise.all([
    supabase
      .from('wishlists')
      .select('id, title, created_at, visibility')
      .eq('owner_id', user!.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false }),
    supabase
      .from('wishlists')
      .select('id, title, created_at, visibility')
      .eq('owner_id', user!.id)
      .eq('is_archived', true)
      .order('updated_at', { ascending: false }),
    // Wishlists shared with current user via selected_friends access
    supabase
      .from('wishlists')
      .select('id, title')
      .eq('visibility', 'selected_friends')
      .eq('is_archived', false)
      .neq('owner_id', user!.id)
      .order('created_at', { ascending: false }),
  ])

  const wishlists       = (activeResult.data ?? []) as Wishlist[]
  const archived        = (archivedResult.data ?? []) as Wishlist[]
  const sharedWishlists = (sharedResult.data ?? []) as { id: string; title: string }[]

  const itemCountMap   = new Map<string, number>()
  const accessCountMap = new Map<string, number>()
  if (wishlists.length > 0) {
    const wishlistIds = wishlists.map(w => w.id)
    const [itemRows, accessRows] = await Promise.all([
      supabase.from('wishlist_items').select('wishlist_id').in('wishlist_id', wishlistIds),
      supabase.from('wishlist_access').select('wishlist_id').in('wishlist_id', wishlistIds),
    ])
    for (const row of (itemRows.data ?? [])) {
      itemCountMap.set(row.wishlist_id, (itemCountMap.get(row.wishlist_id) ?? 0) + 1)
    }
    for (const row of (accessRows.data ?? [])) {
      accessCountMap.set(row.wishlist_id, (accessCountMap.get(row.wishlist_id) ?? 0) + 1)
    }
  }

  const sharedItemCountMap = new Map<string, number>()
  if (sharedWishlists.length > 0) {
    const { data: counts } = await supabase
      .from('wishlist_items')
      .select('wishlist_id')
      .in('wishlist_id', sharedWishlists.map(w => w.id))
      .eq('is_visible', true)
    for (const row of (counts ?? [])) {
      sharedItemCountMap.set(row.wishlist_id, (sharedItemCountMap.get(row.wishlist_id) ?? 0) + 1)
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
          {wishlists.map((w, i) => (
            <li key={w.id}>
              {i > 0 && <div className="h-px bg-[#f3f4f6]" />}
              <WishlistCard
                id={w.id}
                title={w.title}
                itemCount={itemCountMap.get(w.id) ?? 0}
                isArchived={false}
                visibility={w.visibility}
                selectedFriendsCount={accessCountMap.get(w.id) ?? 0}
              />
            </li>
          ))}
        </ul>
      )}

      <CreateWishlistSection />

      {sharedWishlists.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-2 section-title">Доступные вам</h2>
          <ul className="grouped-card">
            {sharedWishlists.map((w, i) => {
              const count = sharedItemCountMap.get(w.id) ?? 0
              return (
                <li key={w.id}>
                  {i > 0 && <div className="h-px bg-[#f3f4f6]" />}
                  <Link
                    href={`/wishlists/${w.id}`}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{w.title}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                        <Lock size={11} className="shrink-0" />
                        По приглашению
                      </p>
                      {count > 0 && (
                        <p className="text-xs text-gray-400">
                          {count} {pluralRu(count, 'желание', 'желания', 'желаний')}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-gray-400">›</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {archived.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-2 text-sm font-medium text-gray-400">Архив</h2>
          <ul className="grouped-card">
            {archived.map((w, i) => (
              <li key={w.id}>
                {i > 0 && <div className="h-px bg-[#f3f4f6]" />}
                <WishlistCard
                  id={w.id}
                  title={w.title}
                  itemCount={0}
                  isArchived={true}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
