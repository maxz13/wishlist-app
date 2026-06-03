import { createServerSupabaseClient } from '@/lib/supabase/server'
import { CreateWishlistSection } from '@/features/wishlists/create-wishlist-section'
import { WishlistCard } from '@/features/wishlists/wishlist-card'

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

  const [activeResult, archivedResult] = await Promise.all([
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
  ])

  const wishlists = (activeResult.data ?? []) as Wishlist[]
  const archived  = (archivedResult.data ?? []) as Wishlist[]

  const itemCountMap = new Map<string, number>()
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
