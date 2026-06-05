'use client'

import { useRef, useState, useTransition } from 'react'
import { createWishlistAction } from './actions'
import type { CreateWishlistState } from './actions'

export function CreateWishlistSection() {
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle] = useState('')
  const [state, setState] = useState<CreateWishlistState>(undefined)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function collapse() {
    setExpanded(false)
    setTitle('')
    setState(undefined)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!title.trim() || pending) return
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createWishlistAction(undefined, formData)
      setState(result)
      if (result?.success) collapse()
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape' && !title.trim()) collapse()
  }

  function handleBlur() {
    if (!title.trim()) collapse()
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="grouped-card mt-3 flex w-full items-center justify-between px-4 py-4 text-left"
      >
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Создать вишлист</p>
          <p className="mt-0.5 text-xs text-gray-400">Новый список желаний</p>
        </div>
        <span className="text-2xl font-light text-gray-300" aria-hidden="true">+</span>
      </button>
    )
  }

  return (
    <div className="grouped-card mt-3 px-4 py-4">
      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          name="title"
          type="text"
          placeholder="Название"
          required
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={pending}
          className="w-full bg-transparent text-sm font-medium text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none disabled:opacity-50"
        />
        {state?.errors?.title && (
          <p className="mt-1 text-xs text-red-600">{state.errors.title[0]}</p>
        )}
        {state?.message && !state.success && (
          <p className="mt-1 text-xs text-red-600">{state.message}</p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={collapse}
            disabled={pending}
            className="text-xs text-gray-400 disabled:opacity-40"
          >
            Отмена
          </button>
          <button
            type="submit"
            onMouseDown={(e) => e.preventDefault()}
            disabled={pending || !title.trim()}
            className="text-xs font-medium text-[#3b82f6] disabled:opacity-40"
          >
            {pending ? 'Создание…' : 'Создать'}
          </button>
        </div>
      </form>
    </div>
  )
}
