'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { reserveItemAction } from './actions'
import type { ReservationState } from './reservation-controls'

interface CircleMarkerProps {
  state: ReservationState
  itemId?: string
  wishlistId?: string
}

export function CircleMarker({ state, itemId, wishlistId }: CircleMarkerProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleReserve() {
    if (!itemId || !wishlistId) return
    startTransition(async () => {
      await reserveItemAction(itemId, wishlistId)
      router.refresh()
    })
  }

  if (state === 'mine') {
    return (
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500">
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
          <path
            d="M1 4l3 3 5-6"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    )
  }

  if (state === 'other') {
    return <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-gray-300" />
  }

  if (itemId && wishlistId) {
    return (
      <button
        type="button"
        onClick={handleReserve}
        disabled={pending}
        aria-label="Зарезервировать"
        className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-gray-300 transition-opacity ${pending ? 'pointer-events-none opacity-40' : ''}`}
      />
    )
  }

  return <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-gray-300" />
}
