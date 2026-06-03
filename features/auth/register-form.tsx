'use client'

import { useState, useActionState } from 'react'
import { registerAction } from './actions'
import type { RegisterFormState } from './schemas'

// Mirrors public.transliterate_ru() in SQL — keep in sync with migration.
const MULTI_TRANS: Array<[RegExp, string]> = [
  [/кс/g, 'x'], [/щ/g, 'sch'], [/ш/g, 'sh'], [/ж/g, 'zh'],
  [/ч/g, 'ch'], [/ц/g, 'ts'],  [/ю/g, 'yu'], [/я/g, 'ya'], [/ё/g, 'yo'],
]
const SINGLE_TRANS: Record<string, string> = {
  'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','з':'z','и':'i','й':'y',
  'к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t',
  'у':'u','ф':'f','х':'h','ы':'y','э':'e','ъ':'','ь':'',
}
function translitRu(s: string): string {
  let r = s.toLowerCase()
  for (const [pat, rep] of MULTI_TRANS) r = r.replace(pat, rep)
  return r.split('').map((c) => (c in SINGLE_TRANS ? SINGLE_TRANS[c] : c)).join('').replace(/[^a-z0-9]/g, '')
}
function buildUsernamePreview(name: string, surname: string): string {
  return translitRu(name).slice(0, 3) + translitRu(surname).slice(0, 3)
}

const initialState: RegisterFormState = undefined

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(registerAction, initialState)
  const [name, setName] = useState('')
  const [surname, setSurname] = useState('')
  const [email, setEmail] = useState('')
  const [birthday, setBirthday] = useState('')
  const [username, setUsername] = useState('')
  const [usernameManual, setUsernameManual] = useState(false)

  // Derived during render — no effect needed.
  // While the user hasn't manually edited the field, reflect name+surname changes live.
  const usernameValue = usernameManual ? username : buildUsernamePreview(name, surname)

  if (state?.success) {
    return <p className="text-sm text-green-700">{state.message}</p>
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
        <label htmlFor="username" className="text-sm font-medium">
          Никнейм
        </label>
        <div className="flex items-center rounded border border-gray-300 focus-within:border-gray-500">
          <span className="select-none px-3 py-2 text-sm text-gray-500">@</span>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="nickname"
            required
            value={usernameValue}
            onChange={(e) => {
              setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
              setUsernameManual(true)
            }}
            className="flex-1 bg-transparent py-2 pr-3 text-sm focus:outline-none"
          />
        </div>
        {state?.errors?.username && (
          <p className="text-xs text-red-600">{state.errors.username[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="birthday" className="text-sm font-medium">
          Дата рождения
        </label>
        <input
          id="birthday"
          name="birthday"
          type="text"
          inputMode="numeric"
          placeholder="ДД.ММ.ГГГГ"
          required
          value={birthday}
          onChange={(e) => setBirthday(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
        {state?.errors?.birthday && (
          <p className="text-xs text-red-600">{state.errors.birthday[0]}</p>
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
          autoComplete="email username"
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
