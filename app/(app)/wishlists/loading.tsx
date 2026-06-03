export default function WishlistsLoading() {
  return (
    <main className="p-4 animate-pulse">
      {/* "Вишлисты" title */}
      <div className="h-5 w-24 rounded bg-gray-200" />

      {/* Wishlists */}
      <div className="mt-4 grouped-card">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            {i > 0 && <div className="h-px bg-[#f3f4f6]" />}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-2/5 rounded bg-gray-200" />
                <div className="h-3 w-1/5 rounded bg-gray-200" />
              </div>
              <div className="ml-4 h-3.5 w-4 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
