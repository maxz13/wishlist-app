'use client'

import { useState, useTransition } from 'react'
import { sendFriendRequestAction, acceptFriendRequestAction } from './actions'

type PersonRow = {
  id: string
  name: string
  surname: string
  avatar_url: string | null
  username: string
}

type Props = {
  friends: PersonRow[]
  isHidden: boolean
  friendName: string
  initialOutgoingIds: string[]
  initialIncomingMap: Record<string, string>
}

export function FriendPeopleSection({
  friends,
  isHidden,
  friendName,
  initialOutgoingIds,
  initialIncomingMap,
}: Props) {
  const [outgoingIds, setOutgoingIds] = useState(() => new Set(initialOutgoingIds))
  const [incomingMap, setIncomingMap] = useState<Record<string, string>>(initialIncomingMap)
  const [, startTransition] = useTransition()

  function handleSend(userId: string) {
    setOutgoingIds(prev => new Set([...prev, userId]))
    startTransition(async () => { await sendFriendRequestAction(userId) })
  }

  function handleAccept(userId: string, requestId: string) {
    setIncomingMap(prev => { const n = { ...prev }; delete n[userId]; return n })
    startTransition(async () => { await acceptFriendRequestAction(requestId) })
  }

  if (isHidden) {
    return (
      <p className="mt-1 text-sm text-gray-400">
        {friendName} скрыл(а) список друзей
      </p>
    )
  }

  if (friends.length === 0) {
    return (
      <p className="mt-1 text-sm text-gray-400">Других друзей пока нет</p>
    )
  }

  return (
    <ul className="grouped-card">
      {friends.map((r, i) => {
        const isOutgoing = outgoingIds.has(r.id)
        const incomingReqId = incomingMap[r.id]
        return (
          <li key={r.id}>
            {i > 0 && <div className="row-divider" />}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                {r.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-gray-200 dark:bg-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    {(r.name[0] + (r.surname?.[0] ?? '')).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{r.name} {r.surname}</p>
                <p className="text-xs text-gray-400">@{r.username}</p>
              </div>
              <div className="shrink-0">
                {incomingReqId ? (
                  <button
                    type="button"
                    onClick={() => handleAccept(r.id, incomingReqId)}
                    className="rounded-lg bg-gray-900 dark:bg-white px-3 py-1.5 text-xs font-medium text-white dark:text-gray-900"
                  >
                    Принять
                  </button>
                ) : isOutgoing ? (
                  <span className="text-xs text-gray-400">Запрос отправлен</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSend(r.id)}
                    className="rounded-lg bg-gray-900 dark:bg-white px-3 py-1.5 text-xs font-medium text-white dark:text-gray-900"
                  >
                    Добавить
                  </button>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
