import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().email('Введите корректный email').trim(),
  password: z.string().min(1, 'Введите пароль'),
})

export const RegisterSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа').trim(),
  surname: z.string().min(2, 'Минимум 2 символа').trim(),
  username: z
    .string()
    .min(3, 'Минимум 3 символа')
    .max(30, 'Максимум 30 символов')
    .regex(/^[a-z][a-z0-9_]{1,28}[a-z0-9]$/, 'Только строчные буквы a–z, цифры и _')
    .refine((v) => !/__/.test(v), 'Нельзя использовать двойное подчёркивание __'),
  email: z.string().email('Введите корректный email').trim(),
  password: z.string().min(8, 'Пароль должен содержать не менее 8 символов'),
  birthday: z.preprocess(
    (val) => {
      if (typeof val !== 'string') return val
      const v = val.trim()
      // Convert DD.MM.YYYY → YYYY-MM-DD before validation
      return /^\d{2}\.\d{2}\.\d{4}$/.test(v)
        ? `${v.slice(6)}-${v.slice(3, 5)}-${v.slice(0, 2)}`
        : v
    },
    z
      .string()
      .min(1, 'Введите дату рождения')
      .refine(
        (val) => {
          const date = new Date(val)
          return !isNaN(date.getTime()) && date <= new Date()
        },
        'Введите корректную дату рождения'
      )
  ),
})

export type LoginFormState =
  | {
      errors?: {
        email?: string[]
        password?: string[]
      }
      message?: string
    }
  | undefined

export type RegisterFormState =
  | {
      errors?: {
        name?: string[]
        surname?: string[]
        username?: string[]
        email?: string[]
        password?: string[]
        birthday?: string[]
      }
      message?: string
      success?: boolean
    }
  | undefined
