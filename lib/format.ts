export function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10  = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

export function getDaysUntilBirthday(birthdayIso: string, today: Date): number {
  const [, month, day] = birthdayIso.split('-').map(Number)
  const todayMidnight  = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const thisYear       = new Date(today.getFullYear(), month - 1, day)
  const target         = thisYear < todayMidnight
    ? new Date(today.getFullYear() + 1, month - 1, day)
    : thisYear
  return Math.round((target.getTime() - todayMidnight.getTime()) / 86_400_000)
}

export function friendBirthdayLine(birthdayIso: string, today: Date): string {
  const daysUntil = getDaysUntilBirthday(birthdayIso, today)
  if (daysUntil === 0) return 'День рождения сегодня'
  if (daysUntil <= 10) return `День рождения через ${daysUntil} ${pluralRu(daysUntil, 'день', 'дня', 'дней')}`
  const [, month, day] = birthdayIso.split('-').map(Number)
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
  return `День рождения ${day} ${months[month - 1]}`
}
