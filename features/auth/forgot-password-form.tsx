'use client'

import { useActionState } from 'react'
import { requestPasswordResetAction, type ForgotPasswordState } from './actions'

const initialState: ForgotPasswordState = undefined

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initialState)

  if (state?.success) {
    return <p className="text-sm text-green-700">{state.message}</p>
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.message && <p className="text-sm text-red-600">{state.message}</p>}
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          Электронная почта
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-black py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Отправка...' : 'Отправить письмо'}
      </button>
    </form>
  )
}
