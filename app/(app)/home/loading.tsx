export default function HomeLoading() {
  return (
    <main className="px-4 pb-10 pt-4 animate-pulse">
      {/* "Лента" title */}
      <div className="h-5 w-14 rounded bg-gray-200" />

      {/* Activity feed skeleton */}
      <div className="mt-4 grouped-card">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            {i > 0 && (
              <div className="flex justify-center">
                <div className="grouped-card-divider" />
              </div>
            )}
            <div className="flex items-start gap-3 px-4 py-3">
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 rounded bg-gray-200" />
                <div className="h-3 w-3/4 rounded bg-gray-200" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Friends section */}
      <div className="mt-8">
        <div className="mb-2 h-4 w-16 rounded bg-gray-200" />
        <div className="grouped-card">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              {i > 0 && <div className="ml-[68px] h-px bg-[#f3f4f6]" />}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 rounded bg-gray-200" />
                  <div className="h-3 w-1/2 rounded bg-gray-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* My wishlists section */}
      <div className="mt-8">
        <div className="mb-2 h-4 w-28 rounded bg-gray-200" />
        <div className="grouped-card">
          {[0, 1].map((i) => (
            <div key={i}>
              {i > 0 && <div className="h-px bg-[#f3f4f6]" />}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-2/5 rounded bg-gray-200" />
                  <div className="h-3 w-1/5 rounded bg-gray-200" />
                </div>
                <div className="h-3.5 w-4 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
