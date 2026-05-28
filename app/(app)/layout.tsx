import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 pb-16">{children}</div>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white">
        <div className="flex h-16 items-center justify-around">
          <Link
            href="/home"
            className="flex flex-1 flex-col items-center py-2 text-xs text-gray-600"
          >
            Главная
          </Link>
          <Link
            href="/friends"
            className="flex flex-1 flex-col items-center py-2 text-xs text-gray-600"
          >
            Друзья
          </Link>
          <Link
            href="/wishlists"
            className="flex flex-1 flex-col items-center py-2 text-xs text-gray-600"
          >
            Вишлисты
          </Link>
          <Link
            href="/profile"
            className="flex flex-1 flex-col items-center py-2 text-xs text-gray-600"
          >
            Профиль
          </Link>
        </div>
      </nav>
    </div>
  )
}
