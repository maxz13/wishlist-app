'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { deleteWishlistItemAction } from './actions'

interface OwnerItemRowProps {
  item: { id: string; title: string; price: number | null }
  wishlistId: string
}

export function OwnerItemRow({ item, wishlistId }: OwnerItemRowProps) {
  const [confirming, setConfirming] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    setDeleteError(null)
    startTransition(async () => {
      const result = await deleteWishlistItemAction(item.id, wishlistId)
      if (result?.error) {
        setDeleteError(result.error)
      }
    })
  }

  return (
    <div className="flex items-start gap-3 py-3.5">
      <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-gray-300" />

      <div className="min-w-0 flex-1">
        <p
          className={`text-[15px] font-medium leading-snug transition-colors ${
            confirming ? 'text-gray-400' : 'text-gray-900'
          }`}
        >
          {confirming ? (
            item.title
          ) : (
            <Link
              href={`/wishlists/${wishlistId}/items/${item.id}`}
              className="block"
            >
              {item.title}
            </Link>
          )}
        </p>

        {!confirming && item.price !== null && (
          <p className="mt-0.5 text-xs text-gray-700">
            {item.price.toLocaleString('ru-RU')} ₽
          </p>
        )}

        {confirming && (
          <div className="mt-1.5">
            <p className="text-sm text-gray-600">Удалить подарок?</p>
            <div className="mt-1.5 flex items-center gap-4">
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="text-sm font-medium text-red-500 disabled:opacity-40"
              >
                {pending ? 'Удаление…' : 'Удалить'}
              </button>
              <button
                type="button"
                onClick={() => { setConfirming(false); setDeleteError(null) }}
                disabled={pending}
                className="text-sm text-gray-400 disabled:opacity-40"
              >
                Отмена
              </button>
            </div>
            {deleteError && (
              <p className="mt-1 text-xs text-red-600">{deleteError}</p>
            )}
          </div>
        )}
      </div>

      {!confirming && (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label="Удалить"
          className="mt-0.5 shrink-0 text-base leading-none text-gray-400"
        >
          ×
        </button>
      )}
    </div>
  )
}
