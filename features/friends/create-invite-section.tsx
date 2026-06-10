'use client'

import { useState, useEffect, useTransition } from 'react'
import { Copy, Share2 } from 'lucide-react'
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
    <section className="mt-6">
      <div className="grouped-card px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none">🎁</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Приглашение в SimpleWish</p>
            <p className="text-xs text-gray-400">Готовый текст со ссылкой</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={handleCopy}
              disabled={isLoading || pending}
              aria-label="Скопировать"
              className="rounded-lg p-2 text-gray-500 dark:text-gray-400 disabled:opacity-40"
            >
              <Copy size={18} />
            </button>
            <button
              type="button"
              onClick={handleShare}
              disabled={isLoading || pending}
              aria-label="Поделиться"
              className="rounded-lg p-2 text-gray-500 dark:text-gray-400 disabled:opacity-40"
            >
              <Share2 size={18} />
            </button>
          </div>
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
