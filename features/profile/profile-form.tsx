'use client'

import { useRef, useState, useTransition } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { logoutAction } from '@/features/auth/actions'
import { updateProfileAction, updateAvatarUrlAction, removeAvatarAction, changePasswordAction, updateFriendsListVisibilityAction, deleteAccountAction } from './actions'
import type { ChangePasswordState } from './actions'
import { formatBirthdayLong } from '@/lib/format'

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
  friends_list_visibility: 'friends' | 'private'
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
  // Canonical stored values — updated optimistically after each inline save
  const [storedName, setStoredName] = useState(profile.name)
  const [storedSurname, setStoredSurname] = useState(profile.surname)
  const [storedBirthdayIso, setStoredBirthdayIso] = useState<string | null>(
    profile.birthday ? profile.birthday.slice(0, 10) : null
  )

  // Inline edit — name
  const [nameEditing, setNameEditing] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)

  // Inline edit — birthday
  const [birthdayEditing, setBirthdayEditing] = useState(false)
  const [birthdayValue, setBirthdayValue] = useState('')
  const [birthdayError, setBirthdayError] = useState<string | null>(null)

  const [, startTransition] = useTransition()

  // Avatar
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

  // Privacy — friends list visibility
  const [visibility, setVisibility] = useState<'friends' | 'private'>(profile.friends_list_visibility)
  const [visibilityOpen, setVisibilityOpen] = useState(false)
  const [visibilityError, setVisibilityError] = useState<string | null>(null)

  // Account deletion
  const [deleteConfirming, setDeleteConfirming] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletePending, startDeleteTransition] = useTransition()

  const displayName = `${storedName} ${storedSurname}`
  const displayBirthday = storedBirthdayIso ? formatBirthdayLong(storedBirthdayIso) : null
  const initials = ((storedName[0] ?? '') + (storedSurname[0] ?? '')).toUpperCase()

  // ── Name ──────────────────────────────────────────────────────────────────

  function enterNameEdit() {
    setNameValue(displayName)
    setNameError(null)
    setNameEditing(true)
  }

  function saveName() {
    const trimmed = nameValue.trim()
    if (!trimmed || trimmed === displayName) {
      setNameEditing(false)
      return
    }
    const parts = trimmed.split(/\s+/)
    if (parts.length < 2) {
      setNameEditing(false)
      setNameError('Введите имя и фамилию')
      return
    }
    const newName = parts[0]
    const newSurname = parts.slice(1).join(' ')
    const prevName = storedName
    const prevSurname = storedSurname
    setStoredName(newName)
    setStoredSurname(newSurname)
    setNameEditing(false)
    setNameError(null)
    const fd = new FormData()
    fd.set('name', newName)
    fd.set('surname', newSurname)
    fd.set('birthday', storedBirthdayIso ?? '')
    startTransition(async () => {
      const result = await updateProfileAction(undefined, fd)
      if (result?.errors || result?.message) {
        setStoredName(prevName)
        setStoredSurname(prevSurname)
        setNameError(
          result?.errors?.name?.[0] ??
          result?.errors?.surname?.[0] ??
          result?.message ??
          'Не удалось сохранить'
        )
      }
    })
  }

  function handleNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); saveName() }
    else if (e.key === 'Escape') { setNameEditing(false); setNameError(null) }
  }

  // ── Birthday ──────────────────────────────────────────────────────────────

  function enterBirthdayEdit() {
    const display = storedBirthdayIso
      ? storedBirthdayIso.slice(0, 10).split('-').reverse().join('.')
      : ''
    setBirthdayValue(display)
    setBirthdayError(null)
    setBirthdayEditing(true)
  }

  function saveBirthday() {
    const trimmed = birthdayValue.trim()

    if (!trimmed) {
      if (!storedBirthdayIso) { setBirthdayEditing(false); return }
      const prevIso = storedBirthdayIso
      setStoredBirthdayIso(null)
      setBirthdayEditing(false)
      setBirthdayError(null)
      const fd = new FormData()
      fd.set('name', storedName)
      fd.set('surname', storedSurname)
      fd.set('birthday', '')
      startTransition(async () => {
        const result = await updateProfileAction(undefined, fd)
        if (result?.errors || result?.message) {
          setStoredBirthdayIso(prevIso)
          setBirthdayError(result?.message ?? 'Не удалось сохранить')
        }
      })
      return
    }

    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
      setBirthdayEditing(false)
      setBirthdayError('Неверный формат даты')
      return
    }

    const [dd, mm, yyyy] = trimmed.split('.').map(Number)
    const date = new Date(yyyy, mm - 1, dd)
    if (date.getFullYear() !== yyyy || date.getMonth() !== mm - 1 || date.getDate() !== dd) {
      setBirthdayEditing(false)
      setBirthdayError('Неверный формат даты')
      return
    }

    const newIso = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
    if (newIso === storedBirthdayIso) { setBirthdayEditing(false); return }

    const prevIso = storedBirthdayIso
    setStoredBirthdayIso(newIso)
    setBirthdayEditing(false)
    setBirthdayError(null)

    const fd = new FormData()
    fd.set('name', storedName)
    fd.set('surname', storedSurname)
    fd.set('birthday', newIso)
    startTransition(async () => {
      const result = await updateProfileAction(undefined, fd)
      if (result?.errors || result?.message) {
        setStoredBirthdayIso(prevIso)
        setBirthdayError(result?.message ?? 'Не удалось сохранить')
      }
    })
  }

  function handleBirthdayChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
    let formatted = digits
    if (digits.length > 2) formatted = digits.slice(0, 2) + '.' + digits.slice(2)
    if (digits.length > 4) formatted = formatted.slice(0, 5) + '.' + formatted.slice(5)
    setBirthdayValue(formatted)
  }

  function handleBirthdayKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); saveBirthday() }
    else if (e.key === 'Escape') { setBirthdayEditing(false); setBirthdayError(null) }
  }

  // ── Avatar ────────────────────────────────────────────────────────────────

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

  // ── Password ──────────────────────────────────────────────────────────────

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

  // ── Visibility ────────────────────────────────────────────────────────────

  async function handleVisibilitySelect(value: 'friends' | 'private') {
    const prev = visibility
    setVisibility(value)
    setVisibilityOpen(false)
    setVisibilityError(null)
    const result = await updateFriendsListVisibilityAction(value)
    if (result?.error) {
      setVisibility(prev)
      setVisibilityError(result.error)
    }
  }

  function handleDeleteAccount() {
    setDeleteError(null)
    startDeleteTransition(async () => {
      const result = await deleteAccountAction()
      if (result?.error) {
        setDeleteError(result.error)
        setDeleteConfirming(false)
      }
    })
  }

  return (
    <div className="flex flex-col gap-10 pb-4">

      {/* ── Avatar ── */}
      <section className="flex flex-col items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative h-32 w-32 overflow-hidden rounded-[40px]"
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

        {avatarUrl ? (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarLoading}
              className="text-sm text-[#2563eb] disabled:opacity-50"
            >
              {avatarLoading ? 'Загрузка...' : 'Изменить фото'}
            </button>
            <button
              type="button"
              onClick={handleAvatarRemove}
              disabled={avatarLoading}
              className="text-sm text-red-400 disabled:opacity-50"
            >
              Удалить
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarLoading}
            className="text-sm text-[#2563eb] disabled:opacity-50"
          >
            {avatarLoading ? 'Загрузка...' : 'Добавить фото'}
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

      {/* ── Personal data ── */}
      <section>
        <div className="grouped-card">

          {/* Name row */}
          {nameEditing ? (
            <div className="px-4 py-3">
              <div className="flex items-center gap-4">
                <span className="shrink-0 text-sm text-gray-500">Имя</span>
                <input
                  autoFocus
                  type="text"
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={handleNameKeyDown}
                  className="flex-1 min-w-0 bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={enterNameEdit}
              className="flex w-full items-center justify-between px-4 py-3"
            >
              <span className="shrink-0 text-sm text-gray-500">Имя</span>
              <span className="min-w-0 truncate pl-4 text-right text-sm text-gray-900 dark:text-gray-100">{displayName}</span>
            </button>
          )}
          {nameError && (
            <p className="px-4 pb-2 text-right text-xs text-red-600">{nameError}</p>
          )}

          <div className="row-divider" />

          {/* Birthday row */}
          {birthdayEditing ? (
            <div className="px-4 py-3">
              <div className="flex items-center gap-4">
                <span className="shrink-0 text-sm text-gray-500">День рождения</span>
                <input
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  placeholder="ДД.ММ.ГГГГ"
                  value={birthdayValue}
                  onChange={handleBirthdayChange}
                  onBlur={saveBirthday}
                  onKeyDown={handleBirthdayKeyDown}
                  className="flex-1 min-w-0 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={enterBirthdayEdit}
              className="flex w-full items-center justify-between px-4 py-3"
            >
              <span className="shrink-0 text-sm text-gray-500">День рождения</span>
              <span className={`text-sm ${displayBirthday ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>
                {displayBirthday ?? 'Не указан'}
              </span>
            </button>
          )}
          {birthdayError && (
            <p className="px-4 pb-2 text-right text-xs text-red-600">{birthdayError}</p>
          )}

          <div className="row-divider" />

          {/* Email row (static) */}
          <div className="flex items-start justify-between gap-4 px-4 py-3">
            <span className="shrink-0 text-sm text-gray-500">Email</span>
            <div className="min-w-0 text-right">
              <p className="truncate text-sm text-gray-900 dark:text-gray-100">{profile.email}</p>
              <p className="mt-0.5 text-xs text-gray-400">Изменение email появится в следующей версии.</p>
            </div>
          </div>

        </div>
      </section>

      {/* ── Logout ── */}
      <section>
        <div className="grouped-card">
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center px-4 py-3 text-sm font-medium text-red-500 dark:text-red-400"
            >
              Выйти из аккаунта
            </button>
          </form>
        </div>
      </section>

      {/* ── Privacy ── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Приватность</h2>
        <div className="grouped-card">
          <button
            type="button"
            onClick={() => setVisibilityOpen(v => !v)}
            className="flex w-full items-center justify-between px-4 py-3"
          >
            <span className="text-sm text-gray-900 dark:text-gray-100">Список друзей</span>
            <span className="flex items-center gap-1 text-sm text-gray-400">
              {visibility === 'friends' ? 'Видят друзья' : 'Только я'}
              <span>›</span>
            </span>
          </button>
          {visibilityOpen && (
            <>
              <div className="row-divider" />
              {(['friends', 'private'] as const).map((val, i) => (
                <div key={val}>
                  {i > 0 && <div className="row-divider" />}
                  <button
                    type="button"
                    onClick={() => handleVisibilitySelect(val)}
                    className="flex w-full items-center gap-3 px-4 py-3"
                  >
                    <span className={`w-3 text-sm ${visibility === val ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>
                      {visibility === val ? '●' : '○'}
                    </span>
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {val === 'friends' ? 'Видят друзья' : 'Только я'}
                    </span>
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
        {visibilityError && (
          <p className="mt-1 text-xs text-red-600">{visibilityError}</p>
        )}
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

      {/* ── Account deletion ── */}
      <section>
        {!deleteConfirming ? (
          <button
            type="button"
            onClick={() => setDeleteConfirming(true)}
            className="text-sm text-gray-400"
          >
            Удалить аккаунт
          </button>
        ) : (
          <div className="flex flex-col gap-4 rounded-2xl border border-red-100 bg-red-50/60 p-4 dark:border-red-900/30 dark:bg-red-950/20">
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Удалить аккаунт?</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Это действие необратимо.</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Безвозвратно будут удалены:</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">профиль · друзья · вишлисты · желания</p>
            </div>
            {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setDeleteConfirming(false); setDeleteError(null) }}
                disabled={deletePending}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 disabled:opacity-40 dark:border-[#323234] dark:text-gray-300"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletePending}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-medium text-white disabled:opacity-40"
              >
                {deletePending ? 'Удаление...' : 'Удалить аккаунт'}
              </button>
            </div>
          </div>
        )}
      </section>

    </div>
  )
}
