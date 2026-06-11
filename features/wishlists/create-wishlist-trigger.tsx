'use client'

import Link from 'next/link'

export function CreateWishlistTrigger({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <Link
      href="/wishlists"
      className={className}
      onClick={() => sessionStorage.setItem('wishlist-create-pending', '1')}
    >
      {children}
    </Link>
  )
}
