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

const MONTHS_RU = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']

export function formatBirthdayLong(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number)
  return `${day} ${MONTHS_RU[month - 1]} ${year}`
}

export function friendBirthdayLine(birthdayIso: string, today: Date): string {
  const daysUntil = getDaysUntilBirthday(birthdayIso, today)
  if (daysUntil === 0) return 'День рождения сегодня'
  if (daysUntil <= 10) return `День рождения через ${daysUntil} ${pluralRu(daysUntil, 'день', 'дня', 'дней')}`
  const [, month, day] = birthdayIso.split('-').map(Number)
  return `День рождения ${day} ${MONTHS_RU[month - 1]}`
}

// Feed label for upcoming birthday events (daysUntil >= 2).
// daysUntil === 1 is handled separately by the caller ("Завтра день рождения у …").
export function birthdayFeedLabel(daysUntil: number): string {
  if (daysUntil <= 3) return `через ${daysUntil} ${pluralRu(daysUntil, 'день', 'дня', 'дней')}`
  if (daysUntil <= 7) return 'через неделю'
  return 'через 2 недели'
}

// Russian genitive/accusative count phrase for new-friends feed events (Phase 2).
// 1 → "одного нового друга", 2-5 → spelled-out genitive, 6+ → numeral.
export function newFriendCountLabel(n: number): string {
  if (n === 1) return 'одного нового друга'
  if (n === 2) return 'двух новых друзей'
  if (n === 3) return 'трёх новых друзей'
  if (n === 4) return 'четырёх новых друзей'
  if (n === 5) return 'пять новых друзей'
  return `${n} новых друзей`
}
