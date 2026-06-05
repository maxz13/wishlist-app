'use client'

import { useState, useTransition } from 'react'
import { updateWishlistTitleAction } from './actions'

export function WishlistTitle({
  wishlistId,
  title,
  isOwner,
}: {
  wishlistId: string
  title: string
  isOwner: boolean
}) {
  const [displayedTitle, setDisplayedTitle] = useState(title)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(title)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function enterEdit() {
    setValue(displayedTitle)
    setError(null)
    setEditing(true)
  }

  function cancel() {
    setEditing(false)
    setError(null)
  }

  function saveDraft() {
    const trimmed = value.trim()
    if (!trimmed || trimmed === displayedTitle) { cancel(); return }
    const previous = displayedTitle
    setDisplayedTitle(trimmed)
    setEditing(false)
    setError(null)
    startTransition(async () => {
      const result = await updateWishlistTitleAction(wishlistId, trimmed)
      if (result?.error) {
        setDisplayedTitle(previous)
        setValue(trimmed)
        setError(result.error)
        setEditing(true)
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); saveDraft() }
    else if (e.key === 'Escape') { cancel() }
  }

  if (!isOwner) {
    return <h1 className="mt-3 text-xl font-bold leading-tight">{title}</h1>
  }

  if (editing) {
    return (
      <>
        {/*
          Intercepts all taps outside the input. Being the topmost layer at
          its position, the tap fires on this overlay — not on whatever is
          underneath — so the underlying element is never activated.
          z-20 sits above the bottom nav (z-10) and item ⋯ menu overlay (z-10).
        */}
        <div className="fixed inset-0 z-20" onClick={saveDraft} />
        <div className="relative z-30 mt-3">
          <input
            autoFocus
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="block w-full bg-transparent ![font-size:1.25rem] font-bold leading-tight text-gray-900 dark:text-gray-100 focus:outline-none"
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      </>
    )
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={enterEdit}
        className="block w-full text-left text-xl font-bold leading-tight text-gray-900 dark:text-gray-100"
      >
        {displayedTitle}
      </button>
    </div>
  )
}
