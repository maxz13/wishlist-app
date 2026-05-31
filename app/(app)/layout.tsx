import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logoutAction } from '@/features/auth/actions'
import { BottomNav } from './bottom-nav'

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
    .select('id, name, surname, avatar_url')
    .eq('id', user.id)
    .single()

  const initials = profile
    ? (profile.name[0] + (profile.surname?.[0] ?? '')).toUpperCase()
    : ''

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
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3 mr-4">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="h-12 w-12 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
              {initials}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-xl font-bold leading-tight text-gray-900">
              {profile.name}
            </p>
            <p className="truncate text-xl font-bold leading-tight text-gray-900">
              {profile.surname}
            </p>
          </div>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="shrink-0 text-sm text-gray-500">
            Выйти
          </button>
        </form>
      </header>

      <div className="flex-1 pb-16">{children}</div>

      <BottomNav initials={initials} avatarUrl={profile.avatar_url ?? null} />
    </div>
  )
}
