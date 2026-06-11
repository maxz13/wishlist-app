'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { updateWishlistExpirationAction } from './actions'

function isoToDisplay(iso: string): string {
  const [yyyy, mm, dd] = iso.split('-')
  return `${dd}.${mm}.${yyyy}`
}

export function WishlistExpiration({
  wishlistId,
  expiresOn,
  isOwner,
}: {
  wishlistId: string
  expiresOn: string | null
  isOwner: boolean
}) {
  const [liveDate,  setLiveDate]  = useState<string | null>(expiresOn)
  const [editing,   setEditing]   = useState(false)
  const [value,     setValue]     = useState(expiresOn ? isoToDisplay(expiresOn) : '')
  const [error,     setError]     = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const inputRef    = useRef<HTMLInputElement>(null)
  // Ref used in onBlur → relatedTarget check to skip blur when tapping "Бессрочно"
  const timelessRef = useRef<HTMLButtonElement>(null)

  // When editing starts, defer focus+select until after the browser finishes its
  // own autoFocus handling (onFocus fires too early — browser resets cursor after it).
  useEffect(() => {
    if (!editing) return
    const input = inputRef.current
    if (!input) return
    requestAnimationFrame(() => {
      input.focus()
      input.select()
    })
  }, [editing])

  const displayLabel = liveDate ? `до ${isoToDisplay(liveDate)}` : 'бессрочно'

  function enterEdit() {
    setValue(liveDate ? isoToDisplay(liveDate) : '')
    setError(null)
    setEditing(true)
  }

  function cancel() {
    setEditing(false)
    setError(null)
    setValue(liveDate ? isoToDisplay(liveDate) : '')
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
    let formatted = digits
    if (digits.length > 2) formatted = digits.slice(0, 2) + '.' + digits.slice(2)
    if (digits.length > 4) formatted = formatted.slice(0, 5) + '.' + formatted.slice(5)
    setValue(formatted)
    setError(null)
  }

  function validateAndSave(onInvalid: 'cancel' | 'error') {
    const trimmed = value.trim()

    if (!trimmed) {
      commitSave(null, '')
      return
    }

    const match = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
    if (!match) {
      if (onInvalid === 'error') setError('Введите дату в формате ДД.ММ.ГГГГ')
      else cancel()
      return
    }

    const [, dd, mm, yyyy] = match
    const dateIso  = `${yyyy}-${mm}-${dd}`
    const todayUtc = new Date().toISOString().slice(0, 10)
    if (dateIso < todayUtc) {
      if (onInvalid === 'error') setError('Дата не может быть в прошлом')
      else cancel()
      return
    }
    if (parseInt(yyyy, 10) > 2099) {
      if (onInvalid === 'error') setError('Слишком оптимистично, укажите реальный срок')
      else cancel()
      return
    }

    commitSave(dateIso, trimmed)
  }

  function commitSave(isoDate: string | null, displayValue: string) {
    const prev = liveDate
    setLiveDate(isoDate)
    setEditing(false)
    setError(null)
    startTransition(async () => {
      const result = await updateWishlistExpirationAction(wishlistId, displayValue)
      if (result.error) {
        setLiveDate(prev)
        setEditing(true)
        setError(result.error)
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter')       { e.preventDefault(); validateAndSave('error') }
    else if (e.key === 'Escape') { cancel() }
  }

  if (!isOwner) {
    if (!liveDate) return null
    return <span className="text-xs text-gray-400">до {isoToDisplay(liveDate)}</span>
  }

  if (editing) {
    return (
      <div>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          placeholder="ДД.ММ.ГГГГ"
          value={value}
          onChange={handleDateChange}
          onBlur={(e) => {
            // If focus is moving to the "Бессрочно" button, let its onClick handle the save
            if (e.relatedTarget === timelessRef.current) return
            validateAndSave('cancel')
          }}
          onKeyDown={handleKeyDown}
          className="w-28 bg-transparent text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
        />
        <button
          ref={timelessRef}
          type="button"
          // onMouseDown preventDefault keeps focus on the input on desktop,
          // so relatedTarget check handles mobile and onMouseDown handles desktop.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => commitSave(null, '')}
          className="mt-0.5 block text-[11px] text-gray-400"
        >
          сделать бессрочным
        </button>
        {error && <p className="mt-0.5 text-[10px] leading-tight text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={enterEdit}
      className="text-xs text-gray-400"
    >
      {displayLabel}
    </button>
  )
}
