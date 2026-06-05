'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Props = { initials: string; avatarUrl: string | null; hasPendingRequests: boolean; hasUnreadInvitedWishlists: boolean }

function HomeIcon() {
  return (
    <svg className="h-[23px] w-[23px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg className="h-[23px] w-[23px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg className="h-[23px] w-[23px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export function BottomNav({ initials, avatarUrl, hasPendingRequests, hasUnreadInvitedWishlists }: Props) {
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  // Base classes shared by all four regular tab items
  function tabCls(href: string) {
    return (
      'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium ' +
      (isActive(href) ? 'text-blue-500' : 'text-gray-400')
    )
  }

  // Fixed 28×28 icon area keeps every tab vertically aligned
  const iconBox = 'flex h-7 w-7 items-center justify-center'

  return (
    <nav className="relative z-10 shrink-0 bg-[#fafafa] dark:bg-[#111111]">
      <div className="flex h-[74px] items-center">

        {/* 1. Лента */}
        <Link href="/home" className={tabCls('/home')}>
          <span className={iconBox}>
            <HomeIcon />
          </span>
          <span>Лента</span>
        </Link>

        {/* 2. Друзья */}
        <Link href="/friends" className={tabCls('/friends')}>
          <span className={`${iconBox} relative`}>
            <UsersIcon />
            {hasPendingRequests && (
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 ring-1 ring-[#fafafa] dark:ring-[#111111]" />
            )}
          </span>
          <span>Друзья</span>
        </Link>

        {/* 3. Central plus button — wrapper carries the raise via -mt-4 so the
            circle itself has no translate (avoids pointer-event misalignment).
            bg-[#3b82f6] is an explicit hex value that bypasses the CSS-variable
            chain and renders reliably in Tailwind v4. */}
        <div className="-mt-[18px] flex flex-1 items-center justify-center">
          <Link
            href="/wishlists"
            aria-label="Создать вишлист"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-[#3b82f6] text-white shadow-lg"
          >
            <PlusIcon />
          </Link>
        </div>

        {/* 4. Вишлисты */}
        <Link href="/wishlists" className={tabCls('/wishlists')}>
          <span className={`${iconBox} relative`}>
            <ListIcon />
            {hasUnreadInvitedWishlists && (
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 ring-1 ring-[#fafafa] dark:ring-[#111111]" />
            )}
          </span>
          <span>Вишлисты</span>
        </Link>

        {/* 5. Профиль */}
        <Link href="/profile" className={tabCls('/profile')}>
          {avatarUrl ? (
            <span
              className={
                'flex h-7 w-7 shrink-0 overflow-hidden rounded-full ' +
                (isActive('/profile') ? 'border-2 border-[#3b82f6]' : '')
              }
            >
              {
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              }
            </span>
          ) : (
            <span
              className={
                iconBox + ' rounded-full text-[10px] font-bold ' +
                (isActive('/profile') ? 'bg-[#3b82f6] text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-300')
              }
            >
              {initials}
            </span>
          )}
          <span>Профиль</span>
        </Link>

      </div>
    </nav>
  )
}
