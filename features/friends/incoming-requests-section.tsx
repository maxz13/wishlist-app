'use client'

import { useState, useTransition } from 'react'
import { acceptFriendRequestAction, declineFriendRequestAction } from './actions'

export type IncomingRequest = {
  id: string
  fromUserId: string
  fromProfile: {
    name: string
    surname: string
    username: string
    avatar_url: string | null
  }
}

type Props = {
  requests: IncomingRequest[]
}

export function IncomingRequestsSection({ requests: initialRequests }: Props) {
  const [requests, setRequests] = useState(initialRequests)
  const [, startTransition] = useTransition()

  if (requests.length === 0) return null

  function remove(id: string) {
    setRequests(prev => prev.filter(r => r.id !== id))
  }

  return (
    <section className="mt-6">
      <h2 className="mb-2 section-title">Входящие запросы</h2>
      <ul className="grouped-card">
        {requests.map((req, i) => (
          <li key={req.id}>
            {i > 0 && <div className="ml-[68px] h-px bg-[#f3f4f6]" />}
            <div className="flex items-start gap-3 px-4 py-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                {req.fromProfile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={req.fromProfile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-gray-200 text-sm font-semibold text-gray-600">
                    {(req.fromProfile.name[0] + (req.fromProfile.surname?.[0] ?? '')).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">@{req.fromProfile.username}</p>
                <p className="text-xs text-gray-400">{req.fromProfile.name} {req.fromProfile.surname}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => { remove(req.id); startTransition(async () => { await acceptFriendRequestAction(req.id) }) }}
                    className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Принять
                  </button>
                  <button
                    type="button"
                    onClick={() => { remove(req.id); startTransition(async () => { await declineFriendRequestAction(req.id) }) }}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700"
                  >
                    Отклонить
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
