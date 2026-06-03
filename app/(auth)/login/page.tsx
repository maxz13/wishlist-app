import Link from 'next/link'
import { LoginForm } from '@/features/auth/login-form'

export default async function LoginPage({
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
        <h1 className="mb-6 text-2xl font-semibold">Вход</h1>
        <LoginForm next={next} />
        <p className="mt-4 text-sm text-gray-600">
          Нет аккаунта?{' '}
          <Link
            href={next ? `/register?next=${encodeURIComponent(next)}` : '/register'}
            className="underline"
          >
            Зарегистрироваться
          </Link>
        </p>
        <p className="mt-2 text-sm text-gray-600">
          <Link href="/forgot-password" className="underline">
            Забыли пароль?
          </Link>
        </p>
      </div>
    </main>
  )
}
