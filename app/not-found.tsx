import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h1 className="text-2xl font-semibold">Страница не найдена</h1>
      <p className="mt-2 text-sm text-gray-500">Такой страницы не существует.</p>
      <Link href="/home" className="mt-6 text-sm underline">
        На главную
      </Link>
    </main>
  )
}
