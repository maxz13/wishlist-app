'use client'

import { useRef, useState, useTransition } from 'react'
import { createWishlistItemAction } from './actions'

export function CreateItemSection({ wishlistId }: { wishlistId: string }) {
  const [expanded, setExpanded] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function collapse() {
    setExpanded(false)
    setValue('')
    setError(null)
  }

  function submit() {
    const trimmed = value.trim()
    if (!trimmed || pending) return
    setError(null)
    const formData = new FormData()
    formData.set('title', trimmed)
    startTransition(async () => {
      const result = await createWishlistItemAction(wishlistId, formData)
      if (result?.success) {
        setValue('')
        inputRef.current?.focus()
      } else if (result?.errors?.title) {
        setError(result.errors.title[0])
      } else if (result?.message) {
        setError(result.message)
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (value.trim()) {
        submit()
      } else {
        collapse()
      }
    } else if (e.key === 'Escape' && !value.trim()) {
      collapse()
    }
  }

  function handleBlur() {
    if (!value.trim()) {
      collapse()
    }
  }

  const circleMarker = (
    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-[11px] leading-none text-gray-400">
      +
    </div>
  )

  if (!expanded) {
    return (
      <div className="border-t border-gray-100">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full items-center gap-3 py-3 text-left"
        >
          {circleMarker}
          <span className="text-[15px] text-gray-400">+ Добавить желание</span>
        </button>
      </div>
    )
  }

  return (
    <div className="border-t border-gray-100">
      <div className="flex items-center gap-3 py-3">
        {circleMarker}
        <input
          ref={inputRef}
          autoFocus
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="Новое желание..."
          disabled={pending}
          className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-gray-900 placeholder-gray-400 focus:outline-none disabled:opacity-50"
        />
        {value.trim() && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={submit}
            disabled={pending}
            aria-label="Создать"
            className="shrink-0 text-sm text-[#3b82f6] disabled:opacity-40"
          >
            {pending ? '…' : '↩'}
          </button>
        )}
      </div>
      {error && (
        <p className="pb-2 pl-8 text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
