'use client'

import Link from 'next/link'
import { useState, useActionState } from 'react'
import { registerAction } from './actions'
import type { RegisterFormState } from './schemas'

const initialState: RegisterFormState = undefined

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(registerAction, initialState)
  const [name, setName] = useState('')
  const [surname, setSurname] = useState('')
  const [email, setEmail] = useState('')

  if (state?.success) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-green-700">{state.message}</p>
        <Link href="/login" className="text-sm underline">
          Войти
        </Link>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}
      {state?.message && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">
          Имя
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="given-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
        {state?.errors?.name && (
          <p className="text-xs text-red-600">{state.errors.name[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="surname" className="text-sm font-medium">
          Фамилия
        </label>
        <input
          id="surname"
          name="surname"
          type="text"
          autoComplete="family-name"
          required
          value={surname}
          onChange={(e) => setSurname(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
        {state?.errors?.surname && (
          <p className="text-xs text-red-600">{state.errors.surname[0]}</p>
        )}
      </div>

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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
        {state?.errors?.email && (
          <p className="text-xs text-red-600">{state.errors.email[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          Пароль
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
        {state?.errors?.password && (
          <p className="text-xs text-red-600">{state.errors.password[0]}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-black py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Регистрация...' : 'Зарегистрироваться'}
      </button>
    </form>
  )
}
