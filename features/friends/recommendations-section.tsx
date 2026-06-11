'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { pluralRu } from '@/lib/format'
import { sendFriendRequestAction, acceptFriendRequestAction, dismissRecommendationAction } from './actions'

type RecommendationRow = {
  id: string
  name: string
  surname: string
  avatar_url: string | null
  username: string
  mutual_count: number
}

type Props = {
  recommendations: RecommendationRow[]
  initialOutgoingIds: string[]
  initialIncomingMap: Record<string, string>
}

export function RecommendationsSection({
  recommendations,
  initialOutgoingIds,
  initialIncomingMap,
}: Props) {
  const [outgoingIds, setOutgoingIds] = useState(() => new Set(initialOutgoingIds))
  const [incomingMap, setIncomingMap] = useState<Record<string, string>>(initialIncomingMap)
  const [dismissedIds, setDismissedIds] = useState(() => new Set<string>())
  const [acceptedIds, setAcceptedIds] = useState(() => new Set<string>())
  const [, startTransition] = useTransition()

  function handleSend(userId: string) {
    setOutgoingIds(prev => new Set([...prev, userId]))
    startTransition(async () => { await sendFriendRequestAction(userId) })
  }

  function handleAccept(userId: string, requestId: string) {
    setIncomingMap(prev => { const n = { ...prev }; delete n[userId]; return n })
    setAcceptedIds(prev => new Set([...prev, userId]))
    startTransition(async () => { await acceptFriendRequestAction(requestId) })
  }

  function handleDismiss(userId: string) {
    setDismissedIds(prev => new Set([...prev, userId]))
    startTransition(async () => { await dismissRecommendationAction(userId) })
  }

  const visible = recommendations.filter(r => !dismissedIds.has(r.id) && !acceptedIds.has(r.id))

  if (visible.length === 0) return null

  return (
    <ul className="grouped-card">
      {visible.map((r, i) => {
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
                <p className="text-xs text-gray-400">
                  {r.mutual_count} {pluralRu(r.mutual_count, 'общий друг', 'общих друга', 'общих друзей')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
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
                {!isOutgoing && (
                  <button
                    type="button"
                    onClick={() => handleDismiss(r.id)}
                    aria-label="Не показывать"
                    title="Не показывать"
                    className="flex items-center justify-center rounded-lg bg-red-500 px-2 py-1.5 text-white opacity-75"
                  >
                    <X size={12} strokeWidth={2.5} />
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
