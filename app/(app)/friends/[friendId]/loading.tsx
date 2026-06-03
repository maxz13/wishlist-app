export default function FriendDetailLoading() {
  return (
    <main className="px-4 pb-10 pt-4 animate-pulse">
      {/* Back link */}
      <div className="h-3.5 w-16 rounded bg-gray-200" />

      {/* "Вишлисты {name}" title */}
      <div className="mt-3 h-6 w-1/2 rounded bg-gray-200" />

      {/* Wishlist cards */}
      <div className="mt-5 flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
            <div className="h-4 w-2/5 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </main>
  )
}
