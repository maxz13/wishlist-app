'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { sendFriendRequestAction, acceptFriendRequestAction } from './actions'

type SearchResult = {
  id: string
  name: string
  surname: string
  avatar_url: string | null
  username: string
}

type Props = {
  initialFriendIds: string[]
  initialOutgoingIds: string[]
  initialIncomingMap: Record<string, string>  // userId → requestId
}

type Status = 'idle' | 'searching' | 'done'

export function SearchSection({ initialFriendIds, initialOutgoingIds, initialIncomingMap }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [friendIds, setFriendIds] = useState(() => new Set(initialFriendIds))
  const [outgoingIds, setOutgoingIds] = useState(() => new Set(initialOutgoingIds))
  const [incomingMap, setIncomingMap] = useState<Record<string, string>>(initialIncomingMap)
  const [, startTransition] = useTransition()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (query.length < 2) return

    timerRef.current = setTimeout(async () => {
      setStatus('searching')
      const supabase = getSupabaseBrowserClient()
      const { data } = await supabase.rpc('search_profiles_by_username_prefix', { p_prefix: query })
      setResults((data ?? []) as SearchResult[])
      setStatus('done')
    }, 300)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  function handleSend(userId: string) {
    setOutgoingIds(prev => new Set([...prev, userId]))
    startTransition(async () => { await sendFriendRequestAction(userId) })
  }

  function handleAccept(userId: string, requestId: string) {
    setFriendIds(prev => new Set([...prev, userId]))
    setIncomingMap(prev => { const n = { ...prev }; delete n[userId]; return n })
    startTransition(async () => { await acceptFriendRequestAction(requestId) })
  }

  const effectiveStatus = query.length < 2 ? 'idle' : status
  const showCard = effectiveStatus === 'searching' || effectiveStatus === 'done'

  return (
    <section className="mt-6">
      <h2 className="mb-2 section-title">Найти друга</h2>
      <div className="grouped-card">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="@никнейм"
          className="w-full bg-transparent px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
        />
      </div>

      {showCard && (
        <ul className="mt-2 grouped-card">
          {effectiveStatus === 'searching' && results.length === 0 && (
            <li className="px-4 py-3 text-sm text-gray-400">Поиск...</li>
          )}
          {effectiveStatus === 'done' && results.length === 0 && (
            <li className="px-4 py-3 text-sm text-gray-400">Никого не найдено</li>
          )}
          {results.map((r, i) => {
            const isFriend = friendIds.has(r.id)
            const isOutgoing = outgoingIds.has(r.id)
            const incomingReqId = incomingMap[r.id]
            return (
              <li key={r.id}>
                {i > 0 && <div className="ml-[68px] h-px bg-[#f3f4f6]" />}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                    {r.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-gray-200 text-sm font-semibold text-gray-600">
                        {(r.name[0] + (r.surname?.[0] ?? '')).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">@{r.username}</p>
                    <p className="text-xs text-gray-400">{r.name} {r.surname}</p>
                  </div>
                  <div className="shrink-0">
                    {isFriend ? (
                      <span className="text-xs text-gray-400">Уже в друзьях</span>
                    ) : incomingReqId ? (
                      <button
                        type="button"
                        onClick={() => handleAccept(r.id, incomingReqId)}
                        className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white"
                      >
                        Принять
                      </button>
                    ) : isOutgoing ? (
                      <span className="text-xs text-gray-400">Запрос отправлен</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSend(r.id)}
                        className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white"
                      >
                        Отправить
                      </button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
