'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Gift } from 'lucide-react'
import { unreserveItemAction } from './actions'

export type ReservationState = 'unreserved' | 'mine' | 'other'

interface ReservationControlsProps {
  itemId: string
  wishlistId: string
  state: ReservationState
  reserverName?: string
}

export function ReservationControls({
  itemId,
  wishlistId,
  state,
  reserverName,
}: ReservationControlsProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleUnreserve() {
    setError(null)
    startTransition(async () => {
      const result = await unreserveItemAction(itemId, wishlistId)
      if (result?.error) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  if (state === 'other') {
    return (
      <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
        <Gift size={12} />
        <span>{reserverName ? `Подарит ${reserverName}` : 'Зарезервировано'}</span>
      </div>
    )
  }

  if (state === 'mine') {
    return (
      <div className="mt-1 flex flex-col gap-0.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-green-700">
            <Gift size={12} />
            <span>Зарезервировано вами</span>
          </div>
          <button
            type="button"
            onClick={handleUnreserve}
            disabled={pending}
            className="text-xs text-gray-400 underline disabled:opacity-50"
          >
            {pending ? '…' : 'Отменить'}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  return null
}
