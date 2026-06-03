'use client'

import { useEffect, useRef, useState } from 'react'
import { OwnerItemRow } from './owner-item-row'

type Item = {
  id: string
  title: string
  link: string | null
  price: number | null
  is_visible: boolean
}

export function OwnerItemList({
  items,
  wishlistId,
  reservedItemIds,
}: {
  items: Item[]
  wishlistId: string
  reservedItemIds: string[]
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (expandedId === null) return
    function handlePointerDown(e: PointerEvent) {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        setExpandedId(null)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [expandedId])

  return (
    <div ref={listRef} className="divide-y divide-gray-100">
      {items.map((item) => (
        <OwnerItemRow
          key={item.id}
          item={item}
          wishlistId={wishlistId}
          isReserved={reservedItemIds.includes(item.id)}
          isExpanded={expandedId === item.id}
          onExpand={() => setExpandedId(item.id)}
          onCollapse={() => setExpandedId(null)}
        />
      ))}
    </div>
  )
}
