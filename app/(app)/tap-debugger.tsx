'use client'

// TEMPORARY — remove this file and its import in layout.tsx when debugging is done.

import { useEffect } from 'react'

function summarize(el: Element | null): string {
  if (!el) return 'null'
  const tag = el.tagName.toLowerCase()
  const id = el.id ? `#${el.id}` : ''
  const cls =
    el.className && typeof el.className === 'string'
      ? '.' + el.className.trim().replace(/\s+/g, '.').slice(0, 50)
      : ''
  const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40)
  return `<${tag}${id}${cls}> "${text}"`
}

export function TapDebugger() {
  useEffect(() => {
    const getNav = () => document.querySelector('nav')
    const getScroll = () => document.querySelector<HTMLElement>('.app-scroll-content')

    function onPointerDown(e: PointerEvent) {
      const x = e.clientX
      const y = e.clientY
      const target = e.target as Element | null
      const fromPoint = document.elementFromPoint(x, y)
      const navEl = getNav()
      const sc = getScroll()

      console.group(`[TAP] pointerdown @ (${x.toFixed(0)}, ${y.toFixed(0)})`)
      console.log('path:', window.location.pathname)
      console.log('scrollTop:', sc?.scrollTop ?? 'n/a')
      console.log('event.target:', summarize(target))
      console.log('elementFromPoint:', summarize(fromPoint))
      console.log(
        'target closest <a>:',
        (target?.closest('a') as HTMLAnchorElement | null)?.href ?? 'none',
      )
      console.log(
        'fromPoint closest <a>:',
        (fromPoint?.closest('a') as HTMLAnchorElement | null)?.href ?? 'none',
      )
      console.log('target inside nav:', navEl ? navEl.contains(target) : 'no nav found')
      console.log(
        'fromPoint inside nav:',
        navEl ? navEl.contains(fromPoint) : 'no nav found',
      )
      if (navEl) {
        const r = navEl.getBoundingClientRect()
        console.log(
          'nav rect:',
          `top:${r.top.toFixed(0)} bottom:${r.bottom.toFixed(0)} left:${r.left.toFixed(0)} right:${r.right.toFixed(0)} h:${r.height.toFixed(0)}`,
        )
      }
      console.groupEnd()
    }

    function onClick(e: MouseEvent) {
      const x = e.clientX
      const y = e.clientY
      const target = e.target as Element | null
      const fromPoint = document.elementFromPoint(x, y)
      const navEl = getNav()

      console.group(`[CLICK] @ (${x.toFixed(0)}, ${y.toFixed(0)})`)
      console.log('event.target:', summarize(target))
      console.log(
        'closest <a>:',
        (target?.closest('a') as HTMLAnchorElement | null)?.href ?? 'none',
      )
      console.log('target inside nav:', navEl ? navEl.contains(target) : 'no nav found')
      console.log(
        'fromPoint inside nav:',
        navEl ? navEl.contains(fromPoint) : 'no nav found',
      )
      console.groupEnd()
    }

    document.addEventListener('pointerdown', onPointerDown, { capture: true })
    document.addEventListener('click', onClick, { capture: true })

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, { capture: true })
      document.removeEventListener('click', onClick, { capture: true })
    }
  }, [])

  return null
}
