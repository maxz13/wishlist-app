import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/features/profile/profile-form'

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [profileResult, friendsResult, wishlistsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name, surname, email, avatar_url, birthday, username')
      .eq('id', user.id)
      .single(),
    supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('wishlists')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .eq('is_archived', false),
  ])

  const profile = profileResult.data
  if (!profile) redirect('/home')

  return (
    <main className="px-4 pb-10 pt-5">
      <h1 className="text-xl font-semibold">Профиль</h1>
      <div className="mt-6">
        <ProfileForm
          profile={profile}
          stats={{
            friendsCount: friendsResult.count ?? 0,
            wishlistsCount: wishlistsResult.count ?? 0,
          }}
        />
      </div>
    </main>
  )
}
