'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { reserveItemAction } from './actions'

export function ReserveButton({
  itemId,
  wishlistId,
}: {
  itemId: string
  wishlistId: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleReserve() {
    setError(null)
    startTransition(async () => {
      const result = await reserveItemAction(itemId, wishlistId)
      if (result?.error) setError(result.error)
      else router.refresh()
    })
  }

  return (
    <div className="mt-0.5 shrink-0">
      <button
        type="button"
        onClick={handleReserve}
        disabled={pending}
        className="rounded-full bg-[#eff6ff] px-2.5 py-1 text-xs font-medium text-[#3b82f6] disabled:opacity-40"
      >
        {pending ? '…' : 'Я подарю'}
      </button>
      {error && <p className="mt-0.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}
