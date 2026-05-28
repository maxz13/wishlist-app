import Link from 'next/link'
import { LoginForm } from '@/features/auth/login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
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
      </div>
    </main>
  )
}
