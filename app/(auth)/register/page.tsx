import Link from 'next/link'
import { RegisterForm } from '@/features/auth/register-form'

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold">Регистрация</h1>
        <RegisterForm />
        <p className="mt-4 text-sm text-gray-600">
          Уже есть аккаунт?{' '}
          <Link href="/login" className="underline">
            Войти
          </Link>
        </p>
      </div>
    </main>
  )
}
