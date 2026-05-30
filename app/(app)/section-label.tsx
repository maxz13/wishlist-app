'use client'

import { usePathname } from 'next/navigation'

function getSectionName(pathname: string): string {
  if (pathname.startsWith('/friends')) return 'Друзья'
  if (pathname.startsWith('/wishlists')) return 'Вишлисты'
  if (pathname.startsWith('/profile')) return 'Профиль'
  return 'Главная'
}

export function SectionLabel() {
  const pathname = usePathname()
  return (
    <p className="text-xs text-gray-400">{getSectionName(pathname)}</p>
  )
}
