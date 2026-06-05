'use client'

import { useRef, useState, useTransition } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { updateProfileAction, updateAvatarUrlAction, removeAvatarAction, changePasswordAction } from './actions'
import type { UpdateProfileState, ChangePasswordState } from './actions'

function EyeIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

type ProfileData = {
  id: string
  name: string
  surname: string
  email: string
  avatar_url: string | null
  birthday: string | null
  username: string
}

type Props = {
  profile: ProfileData
}

function compressImage(file: File, maxDim: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('canvas context failed'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('compression failed')),
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load failed')) }
    img.src = url
  })
}

export function ProfileForm({ profile }: Props) {
  const [name, setName] = useState(profile.name)
  const [surname, setSurname] = useState(profile.surname)
  // Supabase returns `date` as "YYYY-MM-DD"; strip any unexpected timezone suffix
  // so input type="date" always receives a valid date value or empty string.
  const [birthday, setBirthday] = useState(
    // Convert stored YYYY-MM-DD → DD.MM.YYYY for display
    profile.birthday ? profile.birthday.slice(0, 10).split('-').reverse().join('.') : ''
  )
  const [formState, setFormState] = useState<UpdateProfileState>(undefined)
  const [pending, startTransition] = useTransition()

  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Security — password change
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [passwordState, setPasswordState] = useState<ChangePasswordState>(undefined)
  const [passwordPending, startPasswordTransition] = useTransition()

  const initials = (
    (profile.name[0] ?? '') + (profile.surname[0] ?? '')
  ).toUpperCase()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormState(undefined)
    const fd = new FormData()
    fd.set('name', name)
    fd.set('surname', surname)
    // Convert DD.MM.YYYY → YYYY-MM-DD before sending to server
    fd.set('birthday', birthday ? birthday.split('.').reverse().join('-') : '')
    startTransition(async () => {
      const result = await updateProfileAction(undefined, fd)
      setFormState(result)
    })
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarError('Можно загрузить только JPG, PNG или WebP.')
      return
    }

    if (file.size > 6 * 1024 * 1024) {
      setAvatarError('Фото должно быть не больше 6 МБ.')
      return
    }

    setAvatarError(null)
    setAvatarLoading(true)

    try {
      const compressed = await compressImage(file, 768, 0.85)

      const supabase = getSupabaseBrowserClient()
      const path = `${profile.id}/avatar.jpg`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, compressed, { upsert: true, contentType: 'image/jpeg' })

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(path)

      // Cache-bust so the browser fetches the new file immediately
      const urlWithBust = `${publicUrl}?v=${Date.now()}`

      const result = await updateAvatarUrlAction(urlWithBust)
      if (result.error) throw new Error(result.error)

      setAvatarUrl(urlWithBust)
    } catch {
      setAvatarError('Не удалось загрузить фото. Попробуйте ещё раз.')
    } finally {
      setAvatarLoading(false)
    }
  }

  async function handleAvatarRemove() {
    setAvatarError(null)
    setAvatarLoading(true)
    try {
      const result = await removeAvatarAction()
      if (result.error) throw new Error(result.error)
      setAvatarUrl(null)
    } catch {
      setAvatarError('Не удалось удалить фото. Попробуйте ещё раз.')
    } finally {
      setAvatarLoading(false)
    }
  }

  function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPasswordState(undefined)
    const fd = new FormData()
    fd.set('currentPassword', currentPassword)
    fd.set('newPassword', newPassword)
    fd.set('confirmPassword', confirmPassword)
    startPasswordTransition(async () => {
      const result = await changePasswordAction(undefined, fd)
      setPasswordState(result)
      if (result?.success) {
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setShowCurrent(false)
        setShowNew(false)
        setShowConfirm(false)
      }
    })
  }

  function handlePasswordCancel() {
    setPasswordOpen(false)
    setPasswordState(undefined)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setShowCurrent(false)
    setShowNew(false)
    setShowConfirm(false)
  }

  return (
    <div className="flex flex-col gap-10 pb-4">

      {/* ── Avatar ── */}
      <section className="flex flex-col items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative h-32 w-32 overflow-hidden rounded-full"
          disabled={avatarLoading}
          aria-label="Изменить фото"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-gray-200 dark:bg-gray-700 text-4xl font-semibold text-gray-600 dark:text-gray-300">
              {initials}
            </span>
          )}
          {avatarLoading && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-xs text-white">
              ...
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={avatarLoading}
          className="text-sm text-[#2563eb] disabled:opacity-50"
        >
          {avatarLoading ? 'Загрузка...' : 'Изменить фото'}
        </button>

        {avatarUrl && (
          <button
            type="button"
            onClick={handleAvatarRemove}
            disabled={avatarLoading}
            className="text-sm text-gray-400 disabled:opacity-50"
          >
            Удалить фото
          </button>
        )}

        {avatarError && (
          <p className="text-center text-xs text-red-600">{avatarError}</p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </section>

      {/* ── Username — read-only, immutable after registration ── */}
      <section>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Никнейм</p>
        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">@{profile.username}</p>
        <p className="mt-1 text-xs text-gray-400">
          Никнейм используется для поиска друзей и не может быть изменён.
        </p>
      </section>

      {/* ── Edit form ── */}
      <section>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          <div className="grouped-card">

            <div className="px-4 py-3">
              <label className="text-xs font-medium text-gray-500">Имя</label>
              <input
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-0.5 w-full bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none"
              />
              {formState?.errors?.name && (
                <p className="mt-1 text-xs text-red-600">{formState.errors.name[0]}</p>
              )}
            </div>

            <div className="row-divider" />

            <div className="px-4 py-3">
              <label className="text-xs font-medium text-gray-500">Фамилия</label>
              <input
                name="surname"
                type="text"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                required
                className="mt-0.5 w-full bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none"
              />
              {formState?.errors?.surname && (
                <p className="mt-1 text-xs text-red-600">{formState.errors.surname[0]}</p>
              )}
            </div>

            <div className="row-divider" />

            <div className="px-4 py-3">
              <label className="text-xs font-medium text-gray-500">День рождения</label>
              <input
                name="birthday"
                type="text"
                inputMode="numeric"
                placeholder="ДД.ММ.ГГГГ"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="mt-0.5 w-full bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none"
              />
            </div>

            <div className="row-divider" />

            <div className="px-4 py-3">
              <label className="text-xs font-medium text-gray-500">Email</label>
              <p className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">{profile.email}</p>
              <p className="mt-0.5 text-xs text-gray-400">Изменение email появится в следующей версии.</p>
            </div>

          </div>

          {formState?.message && !formState.success && (
            <p className="text-sm text-red-600">{formState.message}</p>
          )}
          {formState?.success && (
            <p className="text-sm text-green-600">Профиль обновлён</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-gray-900 dark:bg-white py-3 text-sm font-medium text-white dark:text-gray-900 disabled:opacity-40"
          >
            {pending ? 'Сохранение...' : 'Сохранить'}
          </button>

        </form>
      </section>

      {/* ── Security ── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Безопасность</h2>

        {!passwordOpen ? (
          <button
            type="button"
            onClick={() => setPasswordOpen(true)}
            className="flex items-center gap-0.5 text-sm text-gray-900 dark:text-gray-100"
          >
            <span>Сменить пароль</span>
            <span className="text-gray-400">→</span>
          </button>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">

            {/* Current password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Текущий пароль</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-gray-200 dark:border-[#323234] bg-gray-50 dark:bg-[#2c2c2e] px-4 py-2.5 pr-10 text-sm text-gray-900 dark:text-gray-100 focus:border-gray-400 focus:bg-white dark:focus:bg-[#2c2c2e] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  aria-label={showCurrent ? 'Скрыть пароль' : 'Показать пароль'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showCurrent ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {passwordState?.errors?.currentPassword && (
                <p className="text-xs text-red-600">{passwordState.errors.currentPassword[0]}</p>
              )}
            </div>

            {/* New password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Новый пароль</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-gray-200 dark:border-[#323234] bg-gray-50 dark:bg-[#2c2c2e] px-4 py-2.5 pr-10 text-sm text-gray-900 dark:text-gray-100 focus:border-gray-400 focus:bg-white dark:focus:bg-[#2c2c2e] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  aria-label={showNew ? 'Скрыть пароль' : 'Показать пароль'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showNew ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {passwordState?.errors?.newPassword && (
                <p className="text-xs text-red-600">{passwordState.errors.newPassword[0]}</p>
              )}
            </div>

            {/* Confirm new password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Подтвердите новый пароль</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-gray-200 dark:border-[#323234] bg-gray-50 dark:bg-[#2c2c2e] px-4 py-2.5 pr-10 text-sm text-gray-900 dark:text-gray-100 focus:border-gray-400 focus:bg-white dark:focus:bg-[#2c2c2e] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Скрыть пароль' : 'Показать пароль'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {passwordState?.errors?.confirmPassword && (
                <p className="text-xs text-red-600">{passwordState.errors.confirmPassword[0]}</p>
              )}
            </div>

            {passwordState?.message && (
              <p className="text-sm text-red-600">{passwordState.message}</p>
            )}
            {passwordState?.success && (
              <p className="text-sm text-green-600">Пароль изменён</p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handlePasswordCancel}
                className="flex-1 rounded-xl border border-gray-200 dark:border-[#323234] py-3 text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={passwordPending}
                className="flex-1 rounded-xl bg-gray-900 dark:bg-white py-3 text-sm font-medium text-white dark:text-gray-900 disabled:opacity-40"
              >
                {passwordPending ? 'Сохранение...' : 'Изменить'}
              </button>
            </div>

          </form>
        )}
      </section>

      {/* ── Account deletion placeholder ── */}
      <section>
        <p className="text-sm text-gray-400">Удаление аккаунта</p>
        <p className="mt-0.5 text-xs text-gray-400">Появится в следующей версии</p>
      </section>

    </div>
  )
}
