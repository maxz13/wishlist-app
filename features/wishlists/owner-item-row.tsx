'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  deleteWishlistItemAction,
  toggleWishlistItemVisibilityAction,
} from './actions'

interface OwnerItemRowProps {
  item: { id: string; title: string; price: number | null; is_visible: boolean }
  wishlistId: string
  isReserved: boolean
}

export function OwnerItemRow({ item, wishlistId, isReserved }: OwnerItemRowProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [visibilityError, setVisibilityError] = useState<string | null>(null)
  const [deletePending, startDeleteTransition] = useTransition()
  const [visibilityPending, startVisibilityTransition] = useTransition()
  const anyPending = deletePending || visibilityPending

  function handleDelete() {
    setDeleteError(null)
    startDeleteTransition(async () => {
      const result = await deleteWishlistItemAction(item.id, wishlistId)
      if (result?.error) {
        setDeleteError(result.error)
      }
    })
  }

  function handleToggleVisibility() {
    setVisibilityError(null)
    startVisibilityTransition(async () => {
      const result = await toggleWishlistItemVisibilityAction(item.id, wishlistId)
      if (result?.error) {
        setVisibilityError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  const isDraft = !item.is_visible

  return (
    <div className={`flex items-start gap-3 py-3.5 ${isReserved ? '-mx-2 rounded-lg bg-green-50 px-2' : ''}`}>
      {confirming ? (
        <div
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${isDraft ? 'bg-gray-300' : 'bg-green-500'}`}
        >
          {!isDraft && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
              <path
                d="M1 4l3 3 5-6"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleToggleVisibility}
          disabled={anyPending}
          aria-label={isDraft ? 'Показать друзьям' : 'Скрыть от друзей'}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-40 ${isDraft ? 'bg-gray-300' : 'bg-green-500'}`}
        >
          {!isDraft && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
              <path
                d="M1 4l3 3 5-6"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      )}

      <div className="min-w-0 flex-1">
        <p
          className={`text-[15px] font-medium leading-snug transition-colors ${
            isDraft || confirming ? 'text-gray-400' : 'text-gray-900'
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
          <p className={`mt-0.5 text-xs ${isDraft ? 'text-gray-400' : 'text-gray-700'}`}>
            {item.price.toLocaleString('ru-RU')} ₽
          </p>
        )}

        {isReserved && !confirming && (
          <p className="mt-0.5 text-xs text-gray-500">Друг подарит</p>
        )}

        {visibilityError && !confirming && (
          <p className="mt-1 text-xs text-red-600">{visibilityError}</p>
        )}

        {confirming && (
          <div className="mt-1.5">
            <p className="text-sm text-gray-600">Удалить подарок?</p>
            <div className="mt-1.5 flex items-center gap-4">
              <button
                type="button"
                onClick={handleDelete}
                disabled={anyPending}
                className="text-sm font-medium text-red-500 disabled:opacity-40"
              >
                {deletePending ? 'Удаление…' : 'Удалить'}
              </button>
              <button
                type="button"
                onClick={() => { setConfirming(false); setDeleteError(null) }}
                disabled={anyPending}
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
          disabled={anyPending}
          aria-label="Удалить"
          className="mt-0.5 shrink-0 text-base leading-none text-gray-400 disabled:opacity-40"
        >
          ×
        </button>
      )}
    </div>
  )
}
