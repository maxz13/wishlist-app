export default function WishlistDetailLoading() {
  return (
    <main className="px-4 pb-10 pt-4 animate-pulse">
      {/* Back link */}
      <div className="h-3.5 w-16 rounded bg-gray-200" />

      {/* Wishlist title */}
      <div className="mt-3 h-6 w-2/3 rounded bg-gray-200" />

      {/* Item rows */}
      <div className="mt-5 divide-y divide-gray-100">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3 py-2.5">
            <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-3/4 rounded bg-gray-200" />
              <div className="h-3 w-1/4 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
