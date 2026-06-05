'use client'

import { useState, useEffect, useTransition } from 'react'
import { createInviteAction } from './actions'

function buildShareText(firstName: string, inviteUrl: string): string {
  const name = firstName.trim() || 'Ваш друг'
  return `${name} приглашает вас в SimpleWish 🎁\n\nПодружитесь в приложении, чтобы видеть списки желаний друг друга.\n\n${inviteUrl}`
}

// Tries navigator.clipboard first; falls back to textarea + execCommand for Safari
// and other restricted contexts. Both methods are called synchronously from the
// user gesture — no awaited network call may precede this.
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const el = document.createElement('textarea')
      el.value = text
      el.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
      document.body.appendChild(el)
      el.focus()
      el.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(el)
      return ok
    } catch {
      return false
    }
  }
}

export function CreateInviteSection() {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()

  // Pre-generate the invite URL on mount so that clipboard.writeText()
  // is called synchronously within the user gesture (required by Safari).
  useEffect(() => {
    let cancelled = false
    createInviteAction().then((result) => {
      if (cancelled) return
      if (result?.inviteUrl) {
        setInviteUrl(result.inviteUrl)
        setFirstName(result.firstName ?? '')
      } else {
        setError(result?.error ?? 'Не удалось создать ссылку.')
      }
    })
    return () => { cancelled = true }
  }, [])

  // true while pre-generation is in flight
  const isLoading = inviteUrl === null && error === null

  function showCopied() {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleCopy() {
    if (!inviteUrl) return
    setError(null)
    // Build text synchronously — no await before copyToClipboard
    const text = buildShareText(firstName, inviteUrl)
    startTransition(async () => {
      const ok = await copyToClipboard(text)
      if (ok) showCopied()
      else setError('Не удалось скопировать. Попробуйте ещё раз.')
    })
  }

  function handleShare() {
    if (!inviteUrl) return
    setError(null)
    const text = buildShareText(firstName, inviteUrl)
    startTransition(async () => {
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ text })
        } catch (e) {
          if (e instanceof Error && e.name !== 'AbortError') {
            const ok = await copyToClipboard(text)
            if (ok) showCopied()
          }
        }
      } else {
        const ok = await copyToClipboard(text)
        if (ok) showCopied()
        else setError('Не удалось скопировать. Попробуйте ещё раз.')
      }
    })
  }

  return (
    <section className="mt-8 border-t border-gray-200 pt-6">
      <h2 className="text-base font-medium">Пригласить друга</h2>
      <p className="mt-1 text-sm text-gray-500">
        Поделитесь приглашением — друг сможет добавить вас и видеть ваши списки желаний.
      </p>

      <div className="grouped-card mt-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none">🎁</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">Приглашение в SimpleWish</p>
            <p className="text-xs text-gray-400">Готовый текст со ссылкой</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={isLoading || pending}
            className="rounded-full border border-gray-200 px-4 py-1.5 text-sm text-gray-700 disabled:opacity-40"
          >
            Скопировать
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={isLoading || pending}
            className="rounded-full border border-gray-200 px-4 py-1.5 text-sm text-gray-700 disabled:opacity-40"
          >
            Поделиться
          </button>
        </div>
        {copied && (
          <p className="mt-2 text-xs text-green-700">✓ Приглашение скопировано</p>
        )}
        {error && (
          <p className="mt-2 text-xs text-red-600">{error}</p>
        )}
      </div>
    </section>
  )
}
