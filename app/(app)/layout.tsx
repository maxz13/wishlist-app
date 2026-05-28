import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logoutAction } from '@/features/auth/actions'

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <p className="text-base font-medium text-gray-800">Профиль не найден</p>
        <p className="mt-2 max-w-xs text-sm text-gray-500">
          Аккаунт существует, но профиль не был создан. Попробуйте выйти и войти снова.
        </p>
        <form action={logoutAction} className="mt-6">
          <button type="submit" className="text-sm underline">
            Выйти
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-gray-200 bg-white px-4">
        <span className="text-sm font-semibold">Вишлист</span>
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-gray-500">
            Выйти
          </button>
        </form>
      </header>

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
