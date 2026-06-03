import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

function mapRpcError(message: string): string {
  if (message.includes('already accepted')) {
    return 'Это приглашение уже было использовано.'
  }
  if (message.includes('not found')) {
    return 'Приглашение не найдено или ссылка недействительна.'
  }
  if (message.includes('own invite')) {
    return 'Нельзя принять собственное приглашение.'
  }
  if (message.includes('different email')) {
    return 'Это приглашение предназначено для другого адреса электронной почты.'
  }
  return 'Не удалось принять приглашение. Попробуйте ещё раз.'
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/invite/${token}`)
  }

  const { error } = await supabase.rpc('accept_invite', { p_token: token })

  if (!error) {
    redirect('/friends')
  }

  const errorMessage = mapRpcError(error.message)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h1 className="text-xl font-semibold">Приглашение</h1>
      <p className="mt-3 text-sm text-gray-700">{errorMessage}</p>
      <Link href="/friends" className="mt-6 text-sm underline">
        К друзьям
      </Link>
    </main>
  )
}
