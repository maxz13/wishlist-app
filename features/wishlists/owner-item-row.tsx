'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  deleteWishlistItemAction,
  toggleWishlistItemVisibilityAction,
  updateWishlistItemAction,
  type UpdateWishlistItemState,
} from './actions'

interface OwnerItemRowProps {
  item: {
    id: string
    title: string
    link: string | null
    price: number | null
    is_visible: boolean
  }
  wishlistId: string
  isReserved: boolean
  isExpanded: boolean
  onExpand: () => void
  onCollapse: () => void
}

export function OwnerItemRow({
  item,
  wishlistId,
  isReserved,
  isExpanded,
  onExpand,
  onCollapse,
}: OwnerItemRowProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [visibilityError, setVisibilityError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<UpdateWishlistItemState>(undefined)
  const [deletePending, startDeleteTransition] = useTransition()
  const [visibilityPending, startVisibilityTransition] = useTransition()
  const [savePending, startSaveTransition] = useTransition()
  const anyPending = deletePending || visibilityPending || savePending

  function handleDelete() {
    setDeleteError(null)
    startDeleteTransition(async () => {
      const result = await deleteWishlistItemAction(item.id, wishlistId)
      if (result?.error) setDeleteError(result.error)
    })
  }

  function handleToggleVisibility() {
    setVisibilityError(null)
    startVisibilityTransition(async () => {
      const result = await toggleWishlistItemVisibilityAction(item.id, wishlistId)
      if (result?.error) setVisibilityError(result.error)
      else router.refresh()
    })
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaveState(undefined)
    const formData = new FormData(e.currentTarget)
    startSaveTransition(async () => {
      const result = await updateWishlistItemAction(item.id, wishlistId, formData)
      if (result?.success) onCollapse()
      else setSaveState(result)
    })
  }

  const isDraft = !item.is_visible
  const showEditFields = isExpanded && !confirming

  return (
    <div className={`flex items-start gap-3 py-2.5 ${isReserved ? '-mx-2 rounded-lg bg-green-50 px-2' : ''}`}>
      {confirming ? (
        <div
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${isDraft ? 'border-2 border-gray-300 bg-transparent' : 'bg-green-500'}`}
        >
          {!isDraft && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
              <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleToggleVisibility}
          disabled={anyPending}
          aria-label={isDraft ? 'Показать друзьям' : 'Скрыть от друзей'}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-40 ${isDraft ? 'border-2 border-gray-300 bg-transparent' : 'bg-green-500'}`}
        >
          {!isDraft && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
              <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
            <button
              type="button"
              onClick={isExpanded ? onCollapse : onExpand}
              className="block w-full text-left"
            >
              {item.title}
            </button>
          )}
        </p>

        {!confirming && item.price !== null && !showEditFields && (
          <p className={`mt-0.5 text-sm ${isDraft ? 'text-gray-400' : 'text-gray-700'}`}>
            {item.price.toLocaleString('ru-RU')} €
          </p>
        )}

        <div
          className={`overflow-hidden transition-all duration-150 ease-in-out ${
            showEditFields ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
          }`}
        >
          <form
            key={showEditFields ? 'open' : 'closed'}
            onSubmit={handleSave}
            className="pb-1 pt-2"
          >
            <div className="flex flex-col gap-2">
              <input
                name="title"
                type="text"
                placeholder="Название"
                defaultValue={item.title}
                className="border-b border-gray-200 bg-transparent pb-1 text-sm text-gray-700 placeholder-gray-400 focus:border-gray-400 focus:outline-none"
              />
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                placeholder="299 €"
                defaultValue={item.price ?? ''}
                className="border-b border-gray-200 bg-transparent pb-1 text-sm text-gray-700 placeholder-gray-400 focus:border-gray-400 focus:outline-none"
              />
              <input
                name="link"
                type="url"
                placeholder="Ссылка на товар"
                defaultValue={item.link ?? ''}
                className="border-b border-gray-200 bg-transparent pb-1 text-sm text-gray-700 placeholder-gray-400 focus:border-gray-400 focus:outline-none"
              />
            </div>
            {(saveState?.errors?.title || saveState?.errors?.price || saveState?.errors?.link || (saveState?.message && !saveState.success)) && (
              <div className="mt-1 flex flex-col gap-0.5">
                {saveState?.errors?.title && <p className="text-xs text-red-600">{saveState.errors.title[0]}</p>}
                {saveState?.errors?.price && <p className="text-xs text-red-600">{saveState.errors.price[0]}</p>}
                {saveState?.errors?.link && <p className="text-xs text-red-600">{saveState.errors.link[0]}</p>}
                {saveState?.message && !saveState.success && <p className="text-xs text-red-600">{saveState.message}</p>}
              </div>
            )}
            <button
              type="submit"
              disabled={savePending}
              className="mt-2.5 text-sm font-medium text-[#3b82f6] disabled:opacity-40"
            >
              {savePending ? 'Сохранение…' : 'Сохранить'}
            </button>
          </form>
        </div>

        {isReserved && !confirming && !showEditFields && (
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
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            disabled={anyPending}
            aria-label="Действия"
            className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center text-xl leading-none text-gray-400 disabled:opacity-40"
          >
            ⋯
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 min-w-[7rem] overflow-hidden rounded-xl bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); setConfirming(true) }}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-500"
                >
                  Удалить
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
