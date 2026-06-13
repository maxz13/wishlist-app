'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { pluralRu, birthdayFeedLabel } from '@/lib/format'

export type ActivityEvent =
  | { type: 'birthday_approaching';    friendId: string; friendName: string; daysUntil: number; ts: string }
  | { type: 'new_friend';              friendId: string; friendName: string; friendSurname: string; ts: string }
  | { type: 'new_wishlist';            wishlistId: string; wishlistTitle: string; friendId: string; friendName: string; fromFamily?: boolean; ts: string }
  | { type: 'new_wishlist_with_items'; wishlistId: string; wishlistTitle: string; friendId: string; friendName: string; count: number; fromFamily?: boolean; ts: string }
  | { type: 'new_items';               count: number; singleTitle: string | null; wishlistId: string; wishlistTitle: string; friendId: string; friendName: string; fromFamily?: boolean; ts: string }
  | { type: 'wishlist_item_reserved';  itemId: string; itemTitle: string; wishlistId: string; wishlistTitle: string; label: string; ts: string }
  | { type: 'wishlist_auto_archived';  wishlistId: string; wishlistTitle: string; ts: string }

function relativeTime(isoString: string): string {
  const diff  = Date.now() - new Date(isoString).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)   return 'только что'
  if (mins  < 60)  return `${mins} мин`
  if (hours < 24)  return `${hours} ч`
  if (days  === 1) return 'вчера'
  return `${days} ${pluralRu(days, 'день', 'дня', 'дней')}`
}

const FALLBACK_COLLAPSED_H = 225

export function FeedList({ events }: { events: ActivityEvent[] }) {
  const ulRef = useRef<HTMLUListElement>(null)
  const [collapsedHeight, setCollapsedHeight] = useState<number | null>(
    events.length > 4 ? FALLBACK_COLLAPSED_H : null
  )

  const measure = useCallback(() => {
    if (events.length <= 4) return
    const ul = ulRef.current
    if (!ul) return
    const items = Array.from(ul.children) as HTMLElement[]
    if (items.length < 5) return

    let ch = 0
    for (let i = 0; i < 4; i++) ch += items[i].getBoundingClientRect().height
    ch += items[4].getBoundingClientRect().height * 0.5
    setCollapsedHeight(ch)
  }, [events.length])

  useEffect(() => {
    if (events.length <= 4) return

    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(measure)
    } else {
      measure()
    }

    const ul = ulRef.current
    if (!ul) return
    const ro = new ResizeObserver(measure)
    ro.observe(ul)
    return () => ro.disconnect()
  }, [events.length, measure])

  const scrollable = events.length > 4

  return (
    <div className={scrollable ? 'relative mt-4' : ''}>
    <ul
      ref={ulRef}
      className={`mx-3${scrollable ? ' overflow-hidden' : ' mt-4'}`}
      style={scrollable && collapsedHeight !== null ? { maxHeight: collapsedHeight } : undefined}
    >
      {events.map((event, i) => (
        <li key={i}>
          <div className="flex items-start gap-3 px-4 py-3">
            <span className="mt-1 feed-bullet" />
            <p className="text-sm leading-snug text-gray-900 dark:text-gray-100">

              {event.type === 'birthday_approaching' && (
                event.daysUntil === 1
                  ? <>{'🎂 Завтра день рождения у '}
                      <Link href={`/friends/${event.friendId}`} className="font-medium">{event.friendName}</Link>
                    </>
                  : <>{'🎂 У '}
                      <Link href={`/friends/${event.friendId}`} className="font-medium">{event.friendName}</Link>
                      {` день рождения ${birthdayFeedLabel(event.daysUntil)}`}
                    </>
              )}

              {event.type === 'new_friend' && (<>
                <Link href={`/friends/${event.friendId}`} className="font-medium">
                  {event.friendName} {event.friendSurname}
                </Link>
                {' теперь в друзьях'}
              </>)}

              {event.type === 'new_wishlist' && (<>
                <Link href={`/friends/${event.friendId}`} className="font-medium">
                  {event.friendName}
                </Link>
                {event.fromFamily ? ' из вашей семьи создал(а) вишлист ' : ' создал(а) вишлист '}
                <Link href={`/wishlists/${event.wishlistId}`} className="font-medium">
                  «{event.wishlistTitle}»
                </Link>
              </>)}

              {event.type === 'new_wishlist_with_items' && (<>
                <Link href={`/friends/${event.friendId}`} className="font-medium">
                  {event.friendName}
                </Link>
                {event.fromFamily ? ' из вашей семьи создал(а) вишлист ' : ' создал(а) вишлист '}
                <Link href={`/wishlists/${event.wishlistId}`} className="font-medium">
                  «{event.wishlistTitle}»
                </Link>
                {` и добавил(а) ${event.count} ${pluralRu(event.count, 'желание', 'желания', 'желаний')}`}
              </>)}

              {event.type === 'new_items' && event.count === 1 && (<>
                <Link href={`/friends/${event.friendId}`} className="font-medium">
                  {event.friendName}
                </Link>
                {event.fromFamily ? ' из вашей семьи добавил(а) желание' : ' добавил(а) желание'}<br />
                <span className="font-medium">{event.singleTitle}</span><br />
                {'в '}
                <Link href={`/wishlists/${event.wishlistId}`} className="font-medium">
                  «{event.wishlistTitle}»
                </Link>
              </>)}

              {event.type === 'new_items' && event.count > 1 && (<>
                <Link href={`/friends/${event.friendId}`} className="font-medium">
                  {event.friendName}
                </Link>
                {event.fromFamily
                  ? ` из вашей семьи добавил(а) ${event.count} ${pluralRu(event.count, 'желание', 'желания', 'желаний')}`
                  : ` добавил(а) ${event.count} ${pluralRu(event.count, 'желание', 'желания', 'желаний')}`}
                {' в '}
                <Link href={`/wishlists/${event.wishlistId}`} className="font-medium">
                  «{event.wishlistTitle}»
                </Link>
              </>)}

              {event.type === 'wishlist_item_reserved' && (<>
                {'Кто-то выбрал подарок: '}
                <Link href={`/wishlists/${event.wishlistId}`} className="font-medium">
                  {event.itemTitle}
                </Link>
                <br />
                <span className="text-gray-400">из «{event.wishlistTitle}»</span>
              </>)}

              {event.type === 'wishlist_auto_archived' && (<>
                {'Вишлист '}
                <Link href={`/wishlists/${event.wishlistId}`} className="font-medium">
                  «{event.wishlistTitle}»
                </Link>
                {' был автоматически архивирован'}
              </>)}

              {event.type !== 'birthday_approaching' && (
                <span className="whitespace-nowrap text-gray-400"> · {relativeTime(event.ts)}</span>
              )}
            </p>
          </div>
        </li>
      ))}
    </ul>
    {scrollable && (
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-[#fafafa] dark:to-[#111111]" />
    )}
    </div>
  )
}
