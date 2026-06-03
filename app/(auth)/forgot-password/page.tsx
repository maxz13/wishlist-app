import Link from 'next/link'
import { ForgotPasswordForm } from '@/features/auth/forgot-password-form'

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 pt-4 pb-[120px]">
      <div className="w-full max-w-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/simplewish-logo.png" alt="SimpleWish" className="mb-9 h-11 w-auto" />
        <h1 className="mb-6 text-2xl font-semibold">Восстановление пароля</h1>
        <ForgotPasswordForm />
        <p className="mt-4 text-sm text-gray-600">
          <Link href="/login" className="underline">
            Назад ко входу
          </Link>
        </p>
      </div>
    </main>
  )
}
