'use client'

import Link from 'next/link'
import { useRef, useState, useTransition } from 'react'
import { pluralRu } from '@/lib/format'
import {
  archiveWishlistAction,
  deleteWishlistAction,
  restoreWishlistAction,
  updateWishlistTitleAction,
} from './actions'

interface WishlistCardProps {
  id: string
  title: string
  itemCount: number
  isArchived: boolean
}

export function WishlistCard({ id, title, itemCount, isArchived }: WishlistCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [renamePending, startRenameTransition] = useTransition()
  const [deletePending, startDeleteTransition] = useTransition()
  const [, startArchiveTransition] = useTransition()
  const anyPending = renamePending || deletePending

  function openRename() {
    setMenuOpen(false)
    setRenameValue(title)
    setRenameError(null)
    setRenaming(true)
  }

  function cancelRename() {
    setRenaming(false)
    setRenameError(null)
  }

  function saveRename() {
    const trimmed = renameValue.trim()
    if (!trimmed || trimmed === title) {
      cancelRename()
      return
    }
    startRenameTransition(async () => {
      const result = await updateWishlistTitleAction(id, trimmed)
      if (result?.error) {
        setRenameError(result.error)
      } else {
        setRenaming(false)
        setRenameError(null)
      }
    })
  }

  function handleRenameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveRename()
    } else if (e.key === 'Escape') {
      cancelRename()
    }
  }

  function handleArchiveToggle() {
    setMenuOpen(false)
    startArchiveTransition(async () => {
      const fd = new FormData()
      fd.set('wishlist_id', id)
      await (isArchived ? restoreWishlistAction : archiveWishlistAction)(fd)
    })
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteWishlistAction(id)
      if (result?.error) setDeleteError(result.error)
    })
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2">
        {renaming ? (
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={cancelRename}
            disabled={renamePending}
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-gray-900 focus:outline-none disabled:opacity-50"
          />
        ) : (
          <Link href={`/wishlists/${id}`} className="min-w-0 flex-1">
            <p className={`text-sm font-medium ${isArchived ? 'text-gray-400' : 'text-gray-900'}`}>
              {title}
            </p>
            {itemCount > 0 && (
              <p className="text-xs text-gray-400">
                {itemCount} {pluralRu(itemCount, 'желание', 'желания', 'желаний')}
              </p>
            )}
          </Link>
        )}

        {!renaming && !confirming && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              disabled={anyPending}
              aria-label="Действия"
              className="-mr-1 flex h-8 w-8 items-center justify-center text-lg leading-none text-gray-400 disabled:opacity-40"
            >
              ⋯
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 min-w-[10rem] overflow-hidden rounded-xl bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={openRename}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700"
                  >
                    Переименовать
                  </button>
                  <button
                    type="button"
                    onClick={handleArchiveToggle}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700"
                  >
                    {isArchived ? 'Восстановить' : 'Архивировать'}
                  </button>
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

      {renameError && (
        <p className="mt-1 text-xs text-red-600">{renameError}</p>
      )}

      {confirming && (
        <div className="mt-2">
          <p className="text-sm font-medium text-gray-700">Удалить вишлист?</p>
          <p className="mt-0.5 text-xs text-gray-500">
            Все желания и резервирования будут удалены.
          </p>
          <div className="mt-2 flex items-center gap-4">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deletePending}
              className="text-sm font-medium text-red-500 disabled:opacity-40"
            >
              {deletePending ? 'Удаление…' : 'Удалить'}
            </button>
            <button
              type="button"
              onClick={() => { setConfirming(false); setDeleteError(null) }}
              disabled={deletePending}
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
  )
}
