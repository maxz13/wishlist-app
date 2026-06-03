export default function FriendsLoading() {
  return (
    <main className="p-4 animate-pulse">
      {/* "Друзья" title */}
      <div className="h-5 w-20 rounded bg-gray-200" />

      {/* Search section */}
      <div className="mt-6">
        <div className="mb-2 h-4 w-24 rounded bg-gray-200" />
        <div className="grouped-card">
          <div className="mx-4 my-3 h-5 rounded bg-gray-200" />
        </div>
      </div>

      {/* Friends list */}
      <div className="mt-6 grouped-card">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            {i > 0 && <div className="ml-[68px] h-px bg-[#f3f4f6]" />}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="h-10 w-10 shrink-0 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 rounded bg-gray-200" />
                <div className="h-3 w-2/5 rounded bg-gray-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
