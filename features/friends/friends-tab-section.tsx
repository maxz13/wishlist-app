'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { sendFamilyRequestAction, removeFamilyMemberAction } from './actions'

export type FriendRow = {
  id: string
  name: string
  surname: string
  avatar_url: string | null
  subline: string | null
  birthdayLine: string | null
}

type Tab = 'all' | 'family'

interface Props {
  friends: FriendRow[]
  familyMemberIds: string[]
  pendingOutgoingFamilyIds: string[]
  pendingIncomingFamilyIds: string[]
}

export function FriendsTabSection({
  friends,
  familyMemberIds,
  pendingOutgoingFamilyIds,
  pendingIncomingFamilyIds,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [liveFamilyIds, setLiveFamilyIds] = useState<string[]>(familyMemberIds)
  const [managingFamily, setManagingFamily] = useState(false)
  const [draftIds, setDraftIds] = useState<Set<string>>(new Set())
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [savePending, startSaveTransition] = useTransition()
  const [removePending, startRemoveTransition] = useTransition()

  const pendingOutgoingSet = new Set(pendingOutgoingFamilyIds)
  const pendingIncomingSet = new Set(pendingIncomingFamilyIds)

  const familyMembers   = friends.filter(f => liveFamilyIds.includes(f.id))
  // Picker only shows friends who are not already family members
  const pickerFriends   = friends.filter(f => !liveFamilyIds.includes(f.id))
  // Pending outgoing: invited but not yet accepted — shown in Family tab list view
  const pendingInvitees = friends.filter(f => pendingOutgoingSet.has(f.id))

  function switchTab(tab: Tab) {
    setActiveTab(tab)
    setManagingFamily(false)
    setSaveError(null)
    setConfirmRemoveId(null)
  }

  function openPicker() {
    setDraftIds(new Set())
    setSaveError(null)
    setManagingFamily(true)
  }

  function closePicker() {
    setManagingFamily(false)
    setSaveError(null)
    setDraftIds(new Set())
  }

  function toggleDraft(id: string) {
    setDraftIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function sendInvitations() {
    setSaveError(null)
    const ids = Array.from(draftIds)
    startSaveTransition(async () => {
      const results = await Promise.all(ids.map(id => sendFamilyRequestAction(id)))
      const failed = results.find(r => r?.error)
      if (failed?.error) {
        setSaveError(failed.error)
      } else {
        setDraftIds(new Set())
        setManagingFamily(false)
      }
    })
  }

  function handleRemoveConfirm(id: string) {
    startRemoveTransition(async () => {
      const result = await removeFamilyMemberAction(id)
      if (result?.error) {
        setSaveError(result.error)
      } else {
        setLiveFamilyIds(prev => prev.filter(fid => fid !== id))
        setConfirmRemoveId(null)
      }
    })
  }

  return (
    <section className="mt-6">
      {/* Segmented control */}
      <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-[#2c2c2e]">
        {(['all', 'family'] as Tab[]).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => switchTab(tab)}
            className={`flex-1 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'rounded-full bg-white text-gray-900 shadow-sm dark:bg-[#3a3a3c] dark:text-gray-100'
                : 'rounded-lg text-gray-500 dark:text-gray-400'
            }`}
          >
            {tab === 'all' ? 'Все друзья' : 'Семья'}
          </button>
        ))}
      </div>

      <div className="mt-4">

        {/* ── ALL FRIENDS TAB ─────────────────────────────────────── */}
        {activeTab === 'all' && (
          friends.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <p className="text-base font-medium text-gray-800 dark:text-gray-200">
                У вас пока нет друзей
              </p>
              <p className="max-w-xs text-sm text-gray-500">
                Пригласите друзей — вы сможете видеть их вишлисты и координировать подарки.
              </p>
            </div>
          ) : (
            <ul className="grouped-card">
              {friends.map((friend, i) => (
                <li key={friend.id}>
                  {i > 0 && <div className="row-divider" />}
                  <Link href={`/friends/${friend.id}`} className="flex items-center gap-3 px-4 py-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl">
                      {friend.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={friend.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-gray-200 dark:bg-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300">
                          {(friend.name[0] + (friend.surname?.[0] ?? '')).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {friend.name} {friend.surname}
                      </p>
                      {friend.subline && <p className="text-xs text-gray-400">{friend.subline}</p>}
                      {friend.birthdayLine && <p className="text-xs text-gray-400">{friend.birthdayLine}</p>}
                    </div>
                    <span className="shrink-0 text-gray-400">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          )
        )}

        {/* ── FAMILY TAB ──────────────────────────────────────────── */}
        {activeTab === 'family' && (
          managingFamily ? (

            /* ── Inline invite picker ── */
            <div className="grouped-card">
              <div className="px-4 py-3">
                {pickerFriends.length === 0 ? (
                  <p className="text-xs text-gray-400">Все друзья уже в семье</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {pickerFriends.map(friend => {
                      const outgoing = pendingOutgoingSet.has(friend.id)
                      const incoming = pendingIncomingSet.has(friend.id)

                      if (outgoing || incoming) {
                        return (
                          <div key={friend.id} className="flex items-center gap-2.5">
                            <span className="h-4 w-4 shrink-0" />
                            <div className="h-7 w-7 shrink-0 overflow-hidden rounded-[8px]">
                              {friend.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={friend.avatar_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center bg-gray-200 dark:bg-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300">
                                  {(friend.name[0] + (friend.surname?.[0] ?? '')).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm text-gray-900 dark:text-gray-100">
                                {friend.name} {friend.surname}
                              </p>
                              <p className="text-xs text-gray-400">
                                {incoming ? 'Ждёт вашего ответа' : 'Приглашение отправлено'}
                              </p>
                            </div>
                          </div>
                        )
                      }

                      return (
                        <button
                          key={friend.id}
                          type="button"
                          onClick={() => toggleDraft(friend.id)}
                          className="flex items-center gap-2.5 text-left"
                        >
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${
                            draftIds.has(friend.id)
                              ? 'bg-[#3b82f6]'
                              : 'border-2 border-gray-300 bg-transparent dark:border-gray-600'
                          }`}>
                            {draftIds.has(friend.id) && (
                              <svg width="8" height="6" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                                <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          <div className="h-7 w-7 shrink-0 overflow-hidden rounded-[8px]">
                            {friend.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={friend.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center bg-gray-200 dark:bg-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300">
                                {(friend.name[0] + (friend.surname?.[0] ?? '')).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-900 dark:text-gray-100">
                            {friend.name} {friend.surname}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              {saveError && <p className="px-4 pb-2 text-xs text-red-600">{saveError}</p>}
              <div className="row-divider" />
              <div className="flex items-center justify-between px-4 py-3">
                <button
                  type="button"
                  onClick={closePicker}
                  disabled={savePending}
                  className="text-xs text-gray-400 disabled:opacity-40"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={sendInvitations}
                  disabled={savePending || draftIds.size === 0}
                  className="text-xs font-medium text-[#3b82f6] disabled:opacity-40"
                >
                  {savePending ? 'Отправка…' : 'Отправить'}
                </button>
              </div>
            </div>

          ) : familyMembers.length === 0 && pendingInvitees.length === 0 ? (

            /* ── Empty state ── */
            <div className="rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-8 flex flex-col items-center text-center gap-3 dark:border-amber-900/20 dark:bg-amber-950/10">
              <div>
                <p className="text-2xl leading-none">🏠</p>
                <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Семья</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                  Добавьте близких людей,<br />которые будут видеть семейные вишлисты.
                </p>
              </div>
              <button
                type="button"
                onClick={openPicker}
                className="mt-1 rounded-xl bg-gray-900 px-5 py-2 text-sm font-medium text-white dark:bg-[#3a3a3c]"
              >
                Добавить членов семьи
              </button>
            </div>

          ) : (

            /* ── Family member list ── */
            <>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="section-title">🏠 Семья</h2>
                <button
                  type="button"
                  onClick={openPicker}
                  className="text-sm text-gray-400"
                >
                  Добавить →
                </button>
              </div>
              {saveError && <p className="mb-2 text-xs text-red-600">{saveError}</p>}

              {/* Confirmed family members */}
              {familyMembers.length > 0 && (
                <ul className="grouped-card">
                  {familyMembers.map((friend, i) => (
                    <li key={friend.id}>
                      {i > 0 && <div className="row-divider" />}
                      {confirmRemoveId === friend.id ? (
                        <div className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Убрать из семьи?</p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            Вы больше не будете видеть семейные вишлисты друг друга.
                          </p>
                          <div className="mt-2 flex items-center gap-4">
                            <button
                              type="button"
                              onClick={() => handleRemoveConfirm(friend.id)}
                              disabled={removePending}
                              className="text-sm font-medium text-red-500 disabled:opacity-40"
                            >
                              {removePending ? 'Убираем…' : 'Убрать'}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setConfirmRemoveId(null); setSaveError(null) }}
                              disabled={removePending}
                              className="text-sm text-gray-400 disabled:opacity-40"
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 px-4 py-3">
                          <Link href={`/friends/${friend.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl">
                              {friend.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={friend.avatar_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center bg-gray-200 dark:bg-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300">
                                  {(friend.name[0] + (friend.surname?.[0] ?? '')).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {friend.name} {friend.surname}
                              </p>
                              {friend.subline && <p className="text-xs text-gray-400">{friend.subline}</p>}
                              {friend.birthdayLine && <p className="text-xs text-gray-400">{friend.birthdayLine}</p>}
                            </div>
                          </Link>
                          <button
                            type="button"
                            onClick={() => { setConfirmRemoveId(friend.id); setSaveError(null) }}
                            className="shrink-0 text-xs text-gray-400"
                          >
                            Убрать
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {/* Pending outgoing invitations */}
              {pendingInvitees.length > 0 && (
                <ul className={`grouped-card${familyMembers.length > 0 ? ' mt-3' : ''}`}>
                  {pendingInvitees.map((friend, i) => (
                    <li key={friend.id}>
                      {i > 0 && <div className="row-divider" />}
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl">
                          {friend.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={friend.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center bg-gray-200 dark:bg-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300">
                              {(friend.name[0] + (friend.surname?.[0] ?? '')).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {friend.name} {friend.surname}
                          </p>
                          <p className="text-xs text-gray-400">Приглашение отправлено</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )
        )}

      </div>
    </section>
  )
}
