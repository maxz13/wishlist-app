'use client'

import { useState, useTransition } from 'react'
import { resetPasswordAction } from './actions'

export function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [matchError, setMatchError] = useState<string | null>(null)
  const [serverMessage, setServerMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMatchError(null)
    setServerMessage(null)

    if (!password || !confirm) {
      setMatchError('Заполните оба поля')
      return
    }
    if (password !== confirm) {
      setMatchError('Пароли не совпадают')
      return
    }

    const formData = new FormData()
    formData.set('password', password)
    startTransition(async () => {
      const result = await resetPasswordAction(undefined, formData)
      if (result?.message) setServerMessage(result.message)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {(matchError || serverMessage) && (
        <p className="text-sm text-red-600">{matchError ?? serverMessage}</p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          Новый пароль
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="confirm" className="text-sm font-medium">
          Повторите пароль
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-black py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Сохранение...' : 'Сохранить пароль'}
      </button>
    </form>
  )
}
