import Link from 'next/link'
import { RegisterForm } from '@/features/auth/register-form'

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center px-4 pt-4 pb-[120px]">
      <div className="w-full max-w-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/simplewish-logo.png" alt="SimpleWish" className="mb-9 h-11 w-auto" />
        <h1 className="mb-6 text-2xl font-semibold">Регистрация</h1>
        <RegisterForm next={next} />
        <p className="mt-4 text-sm text-gray-600">
          Уже есть аккаунт?{' '}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
            className="underline"
          >
            Войти
          </Link>
        </p>
      </div>
    </main>
  )
}
