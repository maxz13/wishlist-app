'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { dismissExpirationGuideAction } from '@/features/profile/actions'

export function ExpirationGuideCard({ firstWishlistId }: { firstWishlistId: string }) {
  const [visible, setVisible] = useState(true)
  const [, startTransition] = useTransition()

  function dismiss() {
    setVisible(false)
    startTransition(() => dismissExpirationGuideAction())
  }

  if (!visible) return null

  return (
    <div className="grouped-card mt-4 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Теперь у вишлистов есть срок
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Добавьте дату, если список нужен к дню рождения, празднику или другому событию.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Не показывать"
          className="shrink-0 flex h-6 w-6 items-center justify-center text-lg leading-none text-gray-400"
        >
          ×
        </button>
      </div>
      <div className="mt-3">
        <Link
          href={`/wishlists/${firstWishlistId}?guide=expiration`}
          className="inline-block rounded-lg bg-[#3b82f6] px-4 py-2 text-sm font-medium text-white"
        >
          Показать, как это работает
        </Link>
      </div>
    </div>
  )
}
