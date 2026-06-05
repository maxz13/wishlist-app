'use client'

import { useEffect } from 'react'
import { markWishlistSeenAction } from './actions'

export function MarkWishlistSeenEffect({ wishlistId }: { wishlistId: string }) {
  useEffect(() => {
    markWishlistSeenAction(wishlistId)
  }, [wishlistId])

  return null
}
