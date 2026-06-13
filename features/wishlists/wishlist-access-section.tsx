'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { pluralRu } from '@/lib/format'
import { updateWishlistVisibilityAction } from './actions'

export type WishlistVisibility = 'all_friends' | 'family' | 'private' | 'selected_friends'

type Friend = { id: string; name: string; surname: string; avatar_url: string | null }

interface WishlistAccessSectionProps {
  wishlistId: string
  currentVisibility: WishlistVisibility
  selectedFriendIds: string[]
  friends: Friend[]
}

function collapsedLabel(
  visibility: WishlistVisibility,
  selectedFriendIds: string[],
  friends: Friend[],
): string {
  if (visibility === 'all_friends') return 'Все друзья'
  if (visibility === 'family')      return 'Семья'
  if (visibility === 'private')     return 'Только я'
  const count = selectedFriendIds.length
  if (count === 0) return 'Только я'
  if (count <= 2) {
    const names = selectedFriendIds
      .map((id) => friends.find((f) => f.id === id)?.name ?? '')
      .filter(Boolean)
      .join(', ')
    return names || 'Только я'
  }
  return `${count} ${pluralRu(count, 'друг', 'друга', 'друзей')}`
}

function Avatar({ friend, size }: { friend: Friend; size: 'sm' | 'xs' }) {
  const dim = size === 'sm' ? 'h-7 w-7' : 'h-6 w-6'
  const textSize = size === 'sm' ? 'text-xs' : 'text-[9px]'
  const initials = (friend.name[0] + (friend.surname?.[0] ?? '')).toUpperCase()
  return (
    <div className={`${dim} shrink-0 overflow-hidden rounded-[8px]`}>
      {friend.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={friend.avatar_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className={`flex h-full w-full items-center justify-center bg-gray-200 dark:bg-gray-700 ${textSize} font-semibold text-gray-600 dark:text-gray-300`}>
          {initials}
        </span>
      )}
    </div>
  )
}

const VISIBILITY_OPTIONS: { value: WishlistVisibility; label: string }[] = [
  { value: 'all_friends',      label: 'Все друзья' },
  { value: 'family',           label: 'Семья' },
  { value: 'selected_friends', label: 'Выбранные друзья' },
  { value: 'private',          label: 'Только я' },
]

export function WishlistAccessSection({
  wishlistId,
  currentVisibility,
  selectedFriendIds,
  friends,
}: WishlistAccessSectionProps) {
  const router = useRouter()

  // Optimistically-maintained committed state — updated on successful save
  const [liveVisibility, setLiveVisibility] = useState<WishlistVisibility>(currentVisibility)
  const [liveSelectedIds, setLiveSelectedIds] = useState<string[]>(selectedFriendIds)

  // Editor state
  const [expanded, setExpanded] = useState(false)
  const [draftVisibility, setDraftVisibility] = useState<WishlistVisibility>(currentVisibility)
  const [draftSelectedIds, setDraftSelectedIds] = useState<Set<string>>(new Set(selectedFriendIds))
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function openExpanded() {
    setDraftVisibility(liveVisibility)
    setDraftSelectedIds(new Set(liveSelectedIds))
    setError(null)
    setExpanded(true)
  }

  function cancel() {
    setExpanded(false)
    setError(null)
  }

  function toggleFriend(id: string) {
    setDraftSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Tapping all_friends or private: immediate save + close.
  // Tapping the already-active simple option: close without saving.
  // Tapping selected_friends: open the friend picker.
  function handleOptionTap(value: WishlistVisibility) {
    if (value === 'selected_friends') {
      setDraftVisibility('selected_friends')
      return
    }
    if (value === liveVisibility) {
      setExpanded(false)
      return
    }
    const prev = liveVisibility
    const prevIds = liveSelectedIds
    setLiveVisibility(value)
    setExpanded(false)
    setError(null)
    startTransition(async () => {
      const result = await updateWishlistVisibilityAction(wishlistId, value, [])
      if (result?.error) {
        setLiveVisibility(prev)
        setLiveSelectedIds(prevIds)
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  // Save for selected_friends (explicit Save button).
  function saveSelectedFriends() {
    setError(null)
    startTransition(async () => {
      const friendIds = Array.from(draftSelectedIds)
      const result = await updateWishlistVisibilityAction(wishlistId, 'selected_friends', friendIds)
      if (result?.error) {
        setError(result.error)
      } else {
        // Server converts selected_friends+0 to private; mirror that locally
        const effective: WishlistVisibility = friendIds.length === 0 ? 'private' : 'selected_friends'
        setLiveVisibility(effective)
        setLiveSelectedIds(friendIds)
        setExpanded(false)
        router.refresh()
      }
    })
  }

  const label = collapsedLabel(liveVisibility, liveSelectedIds, friends)

  // ── Collapsed ──────────────────────────────────────────────────────────────

  if (!expanded) {
    const selectedFriends = liveSelectedIds
      .map((id) => friends.find((f) => f.id === id))
      .filter((f): f is Friend => !!f)

    return (
      <div className="mt-6">
        <div className="grouped-card">
          <button
            type="button"
            onClick={openExpanded}
            className="flex w-full items-center justify-between px-4 py-3"
          >
            <span className="text-sm text-gray-900 dark:text-gray-100">Доступ</span>
            <span className="flex items-center gap-1 text-sm text-gray-400">
              {label}
              <span>›</span>
            </span>
          </button>
          {liveVisibility === 'selected_friends' && selectedFriends.length > 0 && (
            <>
              <div className="row-divider" />
              <div className="flex items-center gap-1.5 px-4 py-2">
                {selectedFriends.slice(0, 6).map((friend) => (
                  <Avatar key={friend.id} friend={friend} size="xs" />
                ))}
                {selectedFriends.length > 6 && (
                  <span className="text-xs text-gray-400">+{selectedFriends.length - 6}</span>
                )}
              </div>
            </>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  // ── Expanded ───────────────────────────────────────────────────────────────

  return (
    <div className="mt-6">
      <div className="grouped-card">

        {/* Radio options — matching Profile → Privacy style */}
        {VISIBILITY_OPTIONS.map((opt, i) => (
          <div key={opt.value}>
            {i > 0 && <div className="row-divider" />}
            <button
              type="button"
              onClick={() => handleOptionTap(opt.value)}
              className="flex w-full items-center gap-3 px-4 py-3"
            >
              <span className={`w-3 text-sm ${draftVisibility === opt.value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>
                {draftVisibility === opt.value ? '●' : '○'}
              </span>
              <span className="text-sm text-gray-900 dark:text-gray-100">{opt.label}</span>
            </button>
          </div>
        ))}

        {/* Friend picker — only shown when selected_friends is active */}
        {draftVisibility === 'selected_friends' && (
          <>
            <div className="row-divider" />
            <div className="px-4 py-3">
              {friends.length === 0 ? (
                <p className="text-xs text-gray-400">Нет принятых друзей</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {friends.map((friend) => (
                    <button
                      key={friend.id}
                      type="button"
                      onClick={() => toggleFriend(friend.id)}
                      className="flex items-center gap-2.5 text-left"
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${
                          draftSelectedIds.has(friend.id)
                            ? 'bg-[#3b82f6]'
                            : 'border-2 border-gray-300 bg-transparent'
                        }`}
                      >
                        {draftSelectedIds.has(friend.id) && (
                          <svg width="8" height="6" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                            <path
                              d="M1 4l3 3 5-6"
                              stroke="white"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                      <Avatar friend={friend} size="sm" />
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {friend.name} {friend.surname}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {error && <p className="px-4 pb-2 text-xs text-red-600">{error}</p>}
            <div className="row-divider" />
            <div className="flex items-center justify-between px-4 py-3">
              <button
                type="button"
                onClick={cancel}
                disabled={pending}
                className="text-xs text-gray-400 disabled:opacity-40"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={saveSelectedFriends}
                disabled={pending}
                className="text-xs font-medium text-[#3b82f6] disabled:opacity-40"
              >
                {pending ? 'Сохранение…' : 'Сохранить'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
