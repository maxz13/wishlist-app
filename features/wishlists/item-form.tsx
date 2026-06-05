'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  updateWishlistItemAction,
  deleteWishlistItemAction,
  type UpdateWishlistItemState,
} from './actions'

interface ItemEditFormProps {
  item: {
    id: string
    title: string
    link: string | null
    price: number | null
  }
  wishlistId: string
  backHref: string
}

export function ItemEditForm({ item, wishlistId, backHref }: ItemEditFormProps) {
  const router = useRouter()
  const [updateState, setUpdateState] = useState<UpdateWishlistItemState>(undefined)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [updatePending, startUpdateTransition] = useTransition()
  const [deletePending, startDeleteTransition] = useTransition()
  const anyPending = updatePending || deletePending

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startUpdateTransition(async () => {
      const result = await updateWishlistItemAction(item.id, wishlistId, formData)
      setUpdateState(result)
      if (result?.success) {
        router.push(backHref)
      }
    })
  }

  function handleDelete() {
    setDeleteError(null)
    startDeleteTransition(async () => {
      const result = await deleteWishlistItemAction(item.id, wishlistId)
      if (result?.error) {
        setDeleteError(result.error)
      }
    })
  }

  return (
    <div className="mt-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Название
          </span>
          <input
            name="title"
            type="text"
            defaultValue={item.title}
            required
            disabled={anyPending}
            className="border-b border-gray-200 dark:border-[#323234] bg-transparent pb-2 text-[15px] font-medium text-gray-900 dark:text-gray-100 focus:border-gray-400 focus:outline-none disabled:opacity-50"
          />
          {updateState?.errors?.title && (
            <p className="text-xs text-red-600">{updateState.errors.title[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Ссылка
          </span>
          <input
            name="link"
            type="url"
            defaultValue={item.link ?? ''}
            placeholder="https://..."
            disabled={anyPending}
            className="border-b border-gray-200 dark:border-[#323234] bg-transparent pb-2 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-300 focus:border-gray-400 focus:outline-none disabled:opacity-50"
          />
          {updateState?.errors?.link && (
            <p className="text-xs text-red-600">{updateState.errors.link[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Цена
          </span>
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={item.price ?? ''}
            placeholder="—"
            disabled={anyPending}
            className="border-b border-gray-200 dark:border-[#323234] bg-transparent pb-2 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-300 focus:border-gray-400 focus:outline-none disabled:opacity-50"
          />
          {updateState?.errors?.price && (
            <p className="text-xs text-red-600">{updateState.errors.price[0]}</p>
          )}
        </div>

        {updateState?.message && !updateState.success && (
          <p className="text-xs text-red-600">{updateState.message}</p>
        )}

        <button
          type="submit"
          disabled={anyPending}
          className="rounded-xl bg-gray-900 dark:bg-white py-3 text-sm font-medium text-white dark:text-gray-900 disabled:opacity-40"
        >
          {updatePending ? 'Сохранение…' : 'Сохранить'}
        </button>
      </form>

      <div className="mt-10 border-t border-gray-100 dark:border-[#323234] pt-6">
        <button
          type="button"
          onClick={handleDelete}
          disabled={anyPending}
          className="text-sm text-red-500 disabled:opacity-40"
        >
          {deletePending ? 'Удаление…' : 'Удалить желание'}
        </button>
        {deleteError && (
          <p className="mt-2 text-xs text-red-600">{deleteError}</p>
        )}
      </div>
    </div>
  )
}
