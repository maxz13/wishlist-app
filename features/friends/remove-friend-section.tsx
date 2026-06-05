'use client'

import { useState, useTransition } from 'react'
import { removeFriendAction } from './actions'

interface RemoveFriendSectionProps {
  friendId: string
}

export function RemoveFriendSection({ friendId }: RemoveFriendSectionProps) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleRemove() {
    setError(null)
    startTransition(async () => {
      const result = await removeFriendAction(friendId)
      if (result?.error) {
        setError(result.error)
        setConfirming(false)
      }
    })
  }

  return (
    <div className="mt-6 border-t border-gray-100 dark:border-[#323234] pt-4">
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-sm text-red-500"
        >
          Удалить из друзей
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Удалить друга?</p>
          <p className="text-xs text-gray-500">
            После удаления вы больше не будете видеть вишлисты друг друга и не сможете резервировать подарки.
          </p>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => { setConfirming(false); setError(null) }}
              disabled={pending}
              className="text-sm text-gray-400 disabled:opacity-40"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={pending}
              className="text-sm font-medium text-red-500 disabled:opacity-40"
            >
              {pending ? 'Удаление…' : 'Удалить'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
