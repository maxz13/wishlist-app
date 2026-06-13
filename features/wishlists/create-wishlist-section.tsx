'use client'

import { useState, useTransition, useRef, useEffect, useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createWishlistAction } from './actions'
import type { CreateWishlistState } from './actions'

type ExpiryMode = 'date' | 'timeless'
type Visibility  = 'all_friends' | 'family' | 'private'

export function CreateWishlistSection() {
  const [expanded,   setExpanded]   = useState(false)
  const [title,      setTitle]      = useState('')
  const [expiryMode, setExpiryMode] = useState<ExpiryMode>('date')
  const [dateValue,  setDateValue]  = useState('')
  const [visibility, setVisibility] = useState<Visibility>('all_friends')
  const [state,      setState]      = useState<CreateWishlistState>(undefined)
  const [pending,    startTransition] = useTransition()

  const pathname = usePathname()

  const isPristine = !title && !dateValue && expiryMode === 'date' && visibility === 'all_friends'

  // Stable refs so effects don't re-attach on every keystroke
  const cardRef        = useRef<HTMLDivElement>(null)
  const titleInputRef  = useRef<HTMLInputElement>(null)
  const isPristineRef  = useRef(isPristine)
  const collapseRef             = useRef<() => void>(null!)
  const expandPendingRef        = useRef<() => void>(null!)
  const suppressCollapseUntilRef = useRef(0)
  isPristineRef.current = isPristine

  function collapse() {
    setExpanded(false)
    setTitle('')
    setExpiryMode('date')
    setDateValue('')
    setVisibility('all_friends')
    setState(undefined)
  }
  collapseRef.current = collapse
  expandPendingRef.current = () => {
    if (sessionStorage.getItem('wishlist-create-pending') !== '1') return
    sessionStorage.removeItem('wishlist-create-pending')
    suppressCollapseUntilRef.current = Date.now() + 450
    setExpanded(true)
    requestAnimationFrame(() => { titleInputRef.current?.focus() })
  }

  // On fresh mount: consume the flag immediately (synchronous, before paint)
  useLayoutEffect(() => { expandPendingRef.current() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // On pathname change: consume the flag if App Router reuses the component
  // instance from its router cache instead of remounting
  useEffect(() => {
    if (pathname === '/wishlists') expandPendingRef.current()
  }, [pathname])

  // Collapse on tap-outside only when the card is pristine (untouched)
  useEffect(() => {
    if (!expanded) return
    function onPointerDown(e: PointerEvent) {
      if (Date.now() < suppressCollapseUntilRef.current) return
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        if (isPristineRef.current) collapseRef.current()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [expanded])

  // Expand when the plus button fires this event from inside /wishlists
  useEffect(() => {
    function onFocusEvent() {
      setExpanded(true) // no-op if already true; preserves user data
    }
    window.addEventListener('wishlist-create-focus', onFocusEvent)
    return () => window.removeEventListener('wishlist-create-focus', onFocusEvent)
  }, [])

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
    let formatted = digits
    if (digits.length > 2) formatted = digits.slice(0, 2) + '.' + digits.slice(2)
    if (digits.length > 4) formatted = formatted.slice(0, 5) + '.' + formatted.slice(5)
    setDateValue(formatted)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!title.trim() || pending) return

    if (expiryMode === 'date' && dateValue.length === 10) {
      const match = dateValue.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
      if (match) {
        const [, dd, mm, yyyy] = match
        const todayUtc = new Date().toISOString().slice(0, 10)
        if (`${yyyy}-${mm}-${dd}` < todayUtc) {
          setState({ errors: { expires_on: ['Дата не может быть в прошлом'] } })
          return
        }
        if (parseInt(yyyy, 10) > 2099) {
          setState({ errors: { expires_on: ['Слишком оптимистично, укажите реальный срок'] } })
          return
        }
      }
    }

    const fd = new FormData()
    fd.set('title', title.trim())
    fd.set('expires_on', expiryMode === 'date' ? dateValue : '')
    fd.set('visibility', visibility)
    startTransition(async () => {
      const result = await createWishlistAction(undefined, fd)
      setState(result)
      if (result?.success) collapse()
    })
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="grouped-card mt-3 overflow-hidden flex w-full items-center justify-between px-4 py-4 text-left"
      >
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Создать вишлист</p>
          <p className="mt-0.5 text-xs text-gray-400">Новый список желаний</p>
        </div>
        <span className="text-2xl font-light text-gray-300" aria-hidden="true">+</span>
      </button>
    )
  }

  return (
    <div ref={cardRef} className="grouped-card mt-3 overflow-hidden">
      <form onSubmit={handleSubmit}>

        {/* Title */}
        <div className="px-4 py-3">
          <input
            ref={titleInputRef}
            type="text"
            placeholder="Название"
            required
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={pending}
            className="w-full bg-transparent text-sm font-medium text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none disabled:opacity-50"
          />
          {state?.errors?.title && (
            <p className="mt-1 text-xs text-red-600">{state.errors.title[0]}</p>
          )}
        </div>

        <div className="row-divider" />

        {/* Срок + Видимость */}
        <div className="flex flex-col gap-3 px-4 py-3">

          {/* Срок */}
          <div>
            <p className="mb-1 text-[11px] font-medium text-gray-400">Срок</p>
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => setExpiryMode('date')}
                className="flex items-center gap-1.5 text-sm text-gray-900 dark:text-gray-100"
              >
                <span className={expiryMode === 'date' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}>
                  {expiryMode === 'date' ? '●' : '○'}
                </span>
                До даты
              </button>
              <button
                type="button"
                onClick={() => setExpiryMode('timeless')}
                className="flex items-center gap-1.5 text-sm text-gray-900 dark:text-gray-100"
              >
                <span className={expiryMode === 'timeless' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}>
                  {expiryMode === 'timeless' ? '●' : '○'}
                </span>
                Бессрочно
              </button>
            </div>
            {expiryMode === 'date' && (
              <div className="mt-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="ДД.ММ.ГГГГ"
                  value={dateValue}
                  onChange={handleDateChange}
                  disabled={pending}
                  className="w-full bg-transparent text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none disabled:opacity-50"
                />
                {state?.errors?.expires_on && (
                  <p className="mt-0.5 text-[11px] text-red-600">{state.errors.expires_on[0]}</p>
                )}
              </div>
            )}
          </div>

          {/* Видимость */}
          <div>
            <p className="mb-1 text-[11px] font-medium text-gray-400">Видимость</p>
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => setVisibility('all_friends')}
                className="flex items-center gap-1.5 text-sm text-gray-900 dark:text-gray-100"
              >
                <span className={visibility === 'all_friends' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}>
                  {visibility === 'all_friends' ? '●' : '○'}
                </span>
                Все друзья
              </button>
              <button
                type="button"
                onClick={() => setVisibility('family')}
                className="flex items-center gap-1.5 text-sm text-gray-900 dark:text-gray-100"
              >
                <span className={visibility === 'family' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}>
                  {visibility === 'family' ? '●' : '○'}
                </span>
                Семья
              </button>
              <button
                type="button"
                onClick={() => setVisibility('private')}
                className="flex items-center gap-1.5 text-sm text-gray-900 dark:text-gray-100"
              >
                <span className={visibility === 'private' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}>
                  {visibility === 'private' ? '●' : '○'}
                </span>
                Только я
              </button>
            </div>
          </div>

        </div>

        <div className="row-divider" />

        {state?.message && !state.success && (
          <p className="px-4 pt-2 text-xs text-red-600">{state.message}</p>
        )}

        {/* Cancel / Create */}
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={collapse}
            disabled={pending}
            className="text-xs text-gray-400 disabled:opacity-40"
          >
            Отмена
          </button>
          <button
            type="submit"
            onMouseDown={(e) => e.preventDefault()}
            disabled={pending || !title.trim()}
            className="text-xs font-medium text-[#3b82f6] disabled:opacity-40"
          >
            {pending ? 'Создание…' : 'Создать'}
          </button>
        </div>

      </form>
    </div>
  )
}
