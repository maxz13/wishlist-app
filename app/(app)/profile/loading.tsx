export default function ProfileLoading() {
  return (
    <main className="px-4 pb-10 pt-5 animate-pulse">
      {/* "Профиль" title */}
      <div className="h-5 w-20 rounded bg-gray-200" />

      <div className="mt-6">
        {/* Avatar */}
        <div className="mx-auto mb-6 h-32 w-32 rounded-full bg-gray-200" />

        {/* Profile fields: name, surname, birthday, email */}
        <div className="grouped-card">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              {i > 0 && <div className="h-px bg-[#f3f4f6]" />}
              <div className="space-y-1 px-4 py-3">
                <div className="h-3 w-1/4 rounded bg-gray-200" />
                <div className="h-4 w-2/3 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
