'use client'

import { useState, useTransition } from 'react'
import { createInviteAction } from './actions'
import type { CreateInviteState } from './actions'

function shortenInviteUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const token = parsed.pathname.split('/').pop() ?? ''
    return `${parsed.host}/invite/${token.slice(0, 8)}···`
  } catch {
    return url
  }
}

export function CreateInviteSection() {
  const [state, setState] = useState<CreateInviteState>(undefined)
  const [pending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)

  function handleClick() {
    startTransition(async () => {
      const result = await createInviteAction()
      setState(result)
      setCopied(false)
    })
  }

  async function handleCopy() {
    if (!state?.inviteUrl) return
    await navigator.clipboard.writeText(state.inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="mt-8 border-t border-gray-200 pt-6">
      <h2 className="text-base font-medium">Пригласить друга</h2>
      <p className="mt-1 text-sm text-gray-500">
        Поделитесь ссылкой — друг увидит ваши вишлисты после регистрации.
      </p>

      <div className="mt-4">
        <button
          type="button"
          onClick={handleClick}
          disabled={pending}
          className="rounded bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? 'Создание...' : 'Создать ссылку-приглашение'}
        </button>
      </div>

      {state?.error && (
        <p className="mt-3 text-sm text-red-600">{state.error}</p>
      )}

      {state?.inviteUrl && (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-sm text-gray-700">Ваша ссылка-приглашение:</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-900">
              {shortenInviteUrl(state.inviteUrl)}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 rounded border border-gray-300 px-3 py-2 text-sm text-gray-700"
            >
              Скопировать
            </button>
          </div>
          {copied && (
            <p className="text-xs text-green-700">Ссылка скопирована</p>
          )}
        </div>
      )}
    </section>
  )
}
