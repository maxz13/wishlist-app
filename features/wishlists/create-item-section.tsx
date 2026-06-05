'use client'

import { useState, useTransition } from 'react'
import { createWishlistItemAction } from './actions'

export function CreateItemSection({ wishlistId }: { wishlistId: string }) {
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [link, setLink] = useState('')
  const [errors, setErrors] = useState<{ title?: string; price?: string; link?: string; message?: string }>({})
  const [pending, startTransition] = useTransition()

  function collapse() {
    setExpanded(false)
    setTitle('')
    setPrice('')
    setLink('')
    setErrors({})
  }

  function submit() {
    const trimmed = title.trim()
    if (!trimmed || pending) return
    setErrors({})
    const formData = new FormData()
    formData.set('title', trimmed)
    formData.set('price', price)
    formData.set('link', link)
    startTransition(async () => {
      const result = await createWishlistItemAction(wishlistId, formData)
      if (result?.success) {
        collapse()
      } else {
        const errs: { title?: string; price?: string; link?: string; message?: string } = {}
        if (result?.errors?.title) errs.title = result.errors.title[0]
        if (result?.errors?.price) errs.price = result.errors.price[0]
        if (result?.errors?.link) errs.link = result.errors.link[0]
        if (result?.message) errs.message = result.message
        setErrors(errs)
      }
    })
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      title.trim() ? submit() : collapse()
    } else if (e.key === 'Escape') {
      collapse()
    }
  }

  function handleFieldKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); submit() }
    else if (e.key === 'Escape') { collapse() }
  }

  function handleContainerBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node) && !title.trim()) {
      collapse()
    }
  }

  if (!expanded) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full items-center gap-3 py-4 text-left"
        >
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-[11px] leading-none text-gray-400">
            +
          </div>
          <span className="text-[15px] text-gray-400">+ Добавить желание</span>
        </button>
      </div>
    )
  }

  return (
    <div
      className="py-3"
      onBlur={handleContainerBlur}
    >
      <div>
        <input
          autoFocus
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={handleTitleKeyDown}
          placeholder="Название"
          disabled={pending}
          className="w-full bg-transparent text-[15px] font-medium leading-snug text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none disabled:opacity-50"
        />
        {errors.title && (
          <p className="mt-0.5 text-xs text-red-600">{errors.title}</p>
        )}
      </div>
      <div className="mt-3 flex flex-col gap-3 pl-3">
        <div>
          <input
            type="text"
            inputMode="decimal"
            value={price}
            onChange={e => setPrice(e.target.value)}
            onKeyDown={handleFieldKeyDown}
            placeholder="299 €"
            disabled={pending}
            className="w-full bg-transparent text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none disabled:opacity-50"
          />
          {errors.price && (
            <p className="mt-0.5 text-xs text-red-600">{errors.price}</p>
          )}
        </div>
        <div>
          <input
            type="url"
            value={link}
            onChange={e => setLink(e.target.value)}
            onKeyDown={handleFieldKeyDown}
            placeholder="Ссылка на товар"
            disabled={pending}
            className="w-full bg-transparent text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none disabled:opacity-50"
          />
          {errors.link && (
            <p className="mt-0.5 text-xs text-red-600">{errors.link}</p>
          )}
        </div>
      </div>
      {errors.message && (
        <p className="mt-1 pl-3 text-xs text-red-600">{errors.message}</p>
      )}
      <button
        type="button"
        onMouseDown={e => e.preventDefault()}
        onClick={submit}
        disabled={pending || !title.trim()}
        className="mt-2.5 pl-3 text-sm font-medium text-[#3b82f6] disabled:opacity-40"
      >
        {pending ? '…' : 'Добавить'}
      </button>
    </div>
  )
}
