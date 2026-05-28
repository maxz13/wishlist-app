import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { CreateItemSection } from '@/features/wishlists/create-item-section'

type WishlistItem = {
  id: string
  title: string
  link: string | null
  price: number | null
}

export default async function WishlistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: wishlist } = await supabase
    .from('wishlists')
    .select('id, title, owner_id')
    .eq('id', id)
    .single()

  if (!wishlist) notFound()

  const { data: itemsData } = await supabase
    .from('wishlist_items')
    .select('id, title, link, price')
    .eq('wishlist_id', id)
    .order('created_at', { ascending: true })

  const items = (itemsData ?? []) as WishlistItem[]
  const isOwner = wishlist.owner_id === user!.id

  return (
    <main className="px-4 pb-10 pt-4">
      <Link href="/wishlists" className="text-sm text-gray-600">
        ‹ Вишлисты
      </Link>

      <h1 className="mt-3 text-xl font-bold leading-tight">{wishlist.title}</h1>

      <div className="mt-5">
        {/* Item list */}
        {items.length > 0 && (
          <div className="divide-y divide-gray-100">
            {items.map((item) => (
              <div key={item.id} className="flex items-start gap-3 py-3.5">
                <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-gray-300" />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium leading-snug text-gray-900">
                    {item.title}
                  </p>
                  {(item.price !== null || item.link) && (
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3">
                      {item.price !== null && (
                        <span className="text-xs text-gray-700">
                          {item.price.toLocaleString('ru-RU')} ₽
                        </span>
                      )}
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-700 underline"
                        >
                          ссылка ↗
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state for non-owner */}
        {items.length === 0 && !isOwner && (
          <p className="py-3 text-sm text-gray-600">Список пока пуст.</p>
        )}

        {/* Add item form — also serves as empty state CTA for owner */}
        {isOwner && <CreateItemSection wishlistId={id} />}
      </div>
    </main>
  )
}
