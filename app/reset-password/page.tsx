import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ResetPasswordForm } from '@/features/auth/reset-password-form'

export default async function ResetPasswordPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <main className="flex min-h-screen items-center justify-center px-4 pt-4 pb-[120px]">
      <div className="w-full max-w-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/simplewish-logo.png" alt="SimpleWish" className="mb-9 h-11 w-auto" />
        <h1 className="mb-6 text-2xl font-semibold">Новый пароль</h1>
        <ResetPasswordForm />
      </div>
    </main>
  )
}
