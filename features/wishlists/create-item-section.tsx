'use client'

import { useState, useTransition } from 'react'
import { createWishlistItemAction } from './actions'
import type { CreateWishlistItemState } from './actions'

export function CreateItemSection({ wishlistId }: { wishlistId: string }) {
  const [state, setState] = useState<CreateWishlistItemState>(undefined)
  const [pending, startTransition] = useTransition()
  const [formKey, setFormKey] = useState(0)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createWishlistItemAction(wishlistId, formData)
      setState(result)
      if (result?.success) {
        setFormKey((k) => k + 1)
        setState(undefined)
      }
    })
  }

  return (
    <div className="border-t border-gray-100">
      <form key={formKey} onSubmit={handleSubmit}>
        {/* New-item row — mirrors the visual rhythm of existing items */}
        <div className="flex items-start gap-3 py-3.5">
          {/* Dashed circle marker signals "new item" */}
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-[11px] leading-none text-gray-400">
            +
          </div>

          <div className="min-w-0 flex-1">
            {/* Primary field — same visual weight as item titles */}
            <input
              name="title"
              type="text"
              placeholder="Новое желание"
              required
              className="w-full bg-transparent text-[15px] font-medium text-gray-900 placeholder-gray-400 focus:outline-none"
            />

            {/* Secondary fields — subtle, de-emphasised */}
            <div className="mt-2 flex flex-col gap-1.5">
              <input
                name="link"
                type="url"
                placeholder="Ссылка (необязательно)"
                className="w-full border-b border-gray-100 bg-transparent pb-1 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-gray-300 focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Цена ₽"
                  className="w-28 border-b border-gray-100 bg-transparent pb-1 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-gray-300 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={pending}
                  className="ml-auto shrink-0 rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                >
                  {pending ? '…' : 'Добавить'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Validation errors — collected below the row */}
        {(state?.errors || (state?.message && !state.success)) && (
          <div className="flex flex-col gap-1 pb-3 pl-8">
            {state?.errors?.title && (
              <p className="text-xs text-red-600">{state.errors.title[0]}</p>
            )}
            {state?.errors?.link && (
              <p className="text-xs text-red-600">{state.errors.link[0]}</p>
            )}
            {state?.errors?.price && (
              <p className="text-xs text-red-600">{state.errors.price[0]}</p>
            )}
            {state?.message && !state.success && (
              <p className="text-xs text-red-600">{state.message}</p>
            )}
          </div>
        )}
      </form>
    </div>
  )
}
