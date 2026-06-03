'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { pluralRu } from '@/lib/format'
import { updateWishlistVisibilityAction } from './actions'

export type WishlistVisibility = 'all_friends' | 'private' | 'selected_friends'

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
  if (visibility === 'private') return 'Только я'
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
    <div className={`${dim} shrink-0 overflow-hidden rounded-full`}>
      {friend.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={friend.avatar_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className={`flex h-full w-full items-center justify-center bg-gray-200 ${textSize} font-semibold text-gray-600`}>
          {initials}
        </span>
      )}
    </div>
  )
}

const VISIBILITY_OPTIONS: { value: WishlistVisibility; label: string }[] = [
  { value: 'all_friends',      label: 'Все друзья' },
  { value: 'private',          label: 'Только я' },
  { value: 'selected_friends', label: 'Выбранные друзья' },
]

export function WishlistAccessSection({
  wishlistId,
  currentVisibility,
  selectedFriendIds,
  friends,
}: WishlistAccessSectionProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [draftVisibility, setDraftVisibility] = useState<WishlistVisibility>(currentVisibility)
  const [draftSelectedIds, setDraftSelectedIds] = useState<Set<string>>(
    new Set(selectedFriendIds),
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function openExpanded() {
    setDraftVisibility(currentVisibility)
    setDraftSelectedIds(new Set(selectedFriendIds))
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

  function save() {
    setError(null)
    startTransition(async () => {
      const friendIds =
        draftVisibility === 'selected_friends' ? Array.from(draftSelectedIds) : []
      const result = await updateWishlistVisibilityAction(wishlistId, draftVisibility, friendIds)
      if (result?.error) {
        setError(result.error)
      } else {
        setExpanded(false)
        router.refresh()
      }
    })
  }

  const label = collapsedLabel(currentVisibility, selectedFriendIds, friends)

  if (!expanded) {
    const selectedFriends = selectedFriendIds
      .map((id) => friends.find((f) => f.id === id))
      .filter((f): f is Friend => !!f)

    return (
      <div className="mt-6 border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Доступ: {label}</p>
          <button
            type="button"
            onClick={openExpanded}
            className="text-sm text-[#3b82f6]"
          >
            Изменить
          </button>
        </div>
        {currentVisibility === 'selected_friends' && selectedFriends.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            {selectedFriends.slice(0, 6).map((friend) => (
              <Avatar key={friend.id} friend={friend} size="xs" />
            ))}
            {selectedFriends.length > 6 && (
              <span className="text-xs text-gray-400">+{selectedFriends.length - 6}</span>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mt-6 border-t border-gray-100 pt-4">
      <div className="flex flex-col gap-3">
        {VISIBILITY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setDraftVisibility(opt.value)}
            className="flex items-center gap-2.5 text-left"
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                draftVisibility === opt.value
                  ? 'border-[#3b82f6] bg-[#3b82f6]'
                  : 'border-gray-300 bg-transparent'
              }`}
            >
              {draftVisibility === opt.value && (
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              )}
            </span>
            <span className="text-sm text-gray-900">{opt.label}</span>
          </button>
        ))}
      </div>

      {draftVisibility === 'selected_friends' && (
        <div className="mt-4 flex flex-col gap-3">
          {friends.length === 0 ? (
            <p className="text-xs text-gray-400">Нет принятых друзей</p>
          ) : (
            friends.map((friend) => (
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
                <span className="text-sm text-gray-900">
                  {friend.name} {friend.surname}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-4 flex items-center justify-between">
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
          onClick={save}
          disabled={pending}
          className="text-xs font-medium text-[#3b82f6] disabled:opacity-40"
        >
          {pending ? 'Сохранение…' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}
