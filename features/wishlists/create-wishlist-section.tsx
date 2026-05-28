'use client'

import { useState, useTransition } from 'react'
import { createWishlistAction } from './actions'
import type { CreateWishlistState } from './actions'

export function CreateWishlistSection() {
  const [state, setState] = useState<CreateWishlistState>(undefined)
  const [pending, startTransition] = useTransition()
  const [title, setTitle] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createWishlistAction(undefined, formData)
      setState(result)
      if (result?.success) {
        setTitle('')
      }
    })
  }

  return (
    <section className="mt-8 border-t border-gray-200 pt-6">
      <h2 className="text-base font-medium">Новый вишлист</h2>

      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <input
            name="title"
            type="text"
            placeholder="Название"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-gray-400 focus:bg-white focus:outline-none"
          />
          {state?.errors?.title && (
            <p className="text-xs text-red-600">{state.errors.title[0]}</p>
          )}
        </div>

        {state?.message && !state.success && (
          <p className="text-sm text-red-600">{state.message}</p>
        )}

        <button
          type="submit"
          disabled={pending || !title.trim()}
          className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {pending ? 'Создание...' : 'Создать'}
        </button>
      </form>
    </section>
  )
}
