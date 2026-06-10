import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/features/profile/profile-form'

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, surname, email, avatar_url, birthday, username, friends_list_visibility')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/home')

  return (
    <main className="px-4 pb-10 pt-5">
      <h1 className="text-xl font-semibold">Профиль</h1>
      <div className="mt-6">
        <ProfileForm profile={profile} />
      </div>
    </main>
  )
}
