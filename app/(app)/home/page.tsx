export default function HomePage() {
  return (
    <main className="p-4">
      <h1 className="text-xl font-semibold">Главная</h1>

      <div className="mt-16 flex flex-col items-center gap-3 text-center">
        <p className="text-base font-medium text-gray-800">
          Здесь пока пусто
        </p>
        <p className="max-w-xs text-sm text-gray-500">
          Создайте вишлист или пригласите друзей — и вы увидите их желания прямо
          здесь.
        </p>
      </div>
    </main>
  )
}
